window.Api = {
  client: null,

  // Fields on `profiles` that only an administrator may change. The database
  // trigger `guard_profile_update` is the real enforcement; this list just
  // keeps the UI from sending privileged changes by accident.
  ADMIN_ONLY_PROFILE_FIELDS: [
    'role', 'approved', 'student_id', 'teacher_id',
    'membership_status', 'membership_expiry',
    'borrow_count', 'reading_streak', 'created_at', 'id'
  ],

  init() {
    this.client = SupabaseClient.get();
  },

  // `AppState` is declared with `const` in js/state.js, so it is a global
  // lexical binding and NEVER becomes a property of `window`. Reading
  // `window.AppState` therefore always yielded undefined, which made both role
  // gates below fail closed: every approve / reject / delete / add-staff call
  // threw "Only staff can approve accounts" even for a signed-in admin.
  _state() {
    if (typeof AppState !== 'undefined' && AppState) return AppState;
    if (typeof window !== 'undefined' && window.AppState) return window.AppState;
    return null;
  },

  _callerIsAdmin() {
    const state = this._state();
    return !!(state && state.isAdmin);
  },

  _callerIsStaff() {
    const state = this._state();
    return !!(state && (state.isAdmin || state.isLibrarian));
  },

  // ── Auth ──────────────────────────────────────────────
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error('Profile not found for this account. Please contact the administrator.');
    if (profile.approved === false) {
      await this.client.auth.signOut();
      throw new Error('Your account is still awaiting approval by the library administrator.');
    }
    return { user: data.user, profile };
  },

  async signUp(email, password, meta = {}) {
    // SECURITY: the signup form is public, so a requested role can never be
    // trusted. Only student/teacher is allowed through; the database trigger
    // enforces the same clamp and always sets approved = false.
    const safeMeta = { ...meta };
    const requestedRole = String(safeMeta.role || 'student').toLowerCase();
    safeMeta.role = (requestedRole === 'teacher') ? 'teacher' : 'student';
    delete safeMeta.approved;
    delete safeMeta.role_admin;

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: safeMeta }
    });
    if (error) throw error;

    // Tell the staff roster about the new registration. This runs as a
    // SECURITY DEFINER function that only allows reporting YOUR OWN signup.
    const newId = data && data.user && data.user.id;
    if (newId) {
      try {
        await this.client.rpc('notify_staff_of_registration', {
          p_user_id: newId,
          p_name: safeMeta.name || '',
          p_role: safeMeta.role
        });
      } catch (e) {
        // Non-fatal: the registration itself succeeded.
        console.warn('Could not notify staff of registration:', e);
      }
    }
    return data;
  },

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await this.client.auth.getSession();
    if (error) throw error;
    return session;
  },

  async updatePassword(newPassword) {
    const { data, error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  // ── Profiles ──────────────────────────────────────────
  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    // SECURITY: refuse to send admin-only fields unless the caller really is
    // an admin, and never let a non-staff edit somebody else's row.
    const session = await this.getSession();
    const callerId = session && session.user && session.user.id;
    if (!callerId) throw new Error('You must be signed in to update a profile.');
    if (callerId !== userId && !this._callerIsStaff()) {
      throw new Error('You can only edit your own profile.');
    }

    if (!this._callerIsAdmin()) {
      const blocked = this.ADMIN_ONLY_PROFILE_FIELDS
        .filter(f => Object.prototype.hasOwnProperty.call(updates, f));
      if (blocked.length) {
        throw new Error('Only an administrator can change: ' + blocked.join(', '));
      }
    }
    const payload = { ...updates };

    const { data, error } = await this.client
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllProfiles() {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async approveUser(userId) {
    if (!this._callerIsStaff()) {
      throw new Error('Only staff can approve accounts.');
    }
    const { data, error } = await this.client
      .from('profiles')
      .update({ approved: true })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    // PostgREST reports a row filtered out by RLS as "0 rows", not as an
    // error, so a stale schema used to show a success toast while nothing
    // was saved. Surface it instead of pretending it worked.
    if (!data) {
      throw new Error('The database refused the approval (row-level security updated 0 rows). The Supabase schema is out of date - run supabase/schema.sql in the Supabase SQL editor, then try again.');
    }
    return data;
  },

  async rejectUser(userId) {
    // Staff may reject a registration that is still unapproved. The database
    // function refuses to remove an approved member or another staff account.
    if (!this._callerIsStaff()) {
      throw new Error('Only staff can reject registrations.');
    }
    const { error } = await this.client.rpc('reject_registration', { p_user_id: userId });
    if (error) throw error;
  },

  async deleteUser(userId) {
    // SECURITY: administrator only, and it goes through the SECURITY DEFINER
    // function that removes the auth user too. There is deliberately NO
    // fallback to a direct profiles delete: that would leave an orphaned
    // auth account behind and used to be reachable by librarians.
    if (!this._callerIsAdmin()) {
      throw new Error('Only an administrator can delete accounts.');
    }
    const session = await this.getSession();
    if (session && session.user && session.user.id === userId) {
      throw new Error('You cannot delete your own account from the user list.');
    }
    const { error } = await this.client.rpc('delete_account', { p_user_id: userId });
    if (error) throw error;
  },

  async deleteOwnAccount() {
    const { error } = await this.client.rpc('delete_my_account');
    if (error) throw error;
  },

  async deleteAccount(userId) {
    await this.deleteUser(userId);
  },

  async addLibrarian({ email, password, name, role = 'librarian', department }) {
    if (!this._callerIsAdmin()) {
      throw new Error('Only an administrator can add staff accounts.');
    }
    const { data, error } = await this.client.rpc('add_staff_account', {
      p_email: email,
      p_password: password,
      p_name: name,
      p_role: role,
      p_department: department || ''
    });
    if (error) throw error;
    return data;
  },

  async getPendingUsers() {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Books ─────────────────────────────────────────────
  async getAllBooks() {
    const { data, error } = await this.client
      .from('books')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getBook(bookId) {
    const { data, error } = await this.client
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();
    if (error) throw error;
    return data;
  },

  async searchBooks(query) {
    const { data, error } = await this.client
      .from('books')
      .select('*')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%`)
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createBook(book) {
    const { data, error } = await this.client
      .from('books')
      .insert(book)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

async updateBook(bookId, updates) {
    const { data, error } = await this.client
      .from('books')
      .update(updates)
      .eq('id', bookId)
      .select();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? (data[0] || null) : null;
  },

  async deleteBook(bookId) {
    const { error } = await this.client
      .from('books')
      .delete()
      .eq('id', bookId);
    if (error) throw error;
  },

  // ── Book PDF (server-enforced: admin/librarian only) ──
  // The upload goes through Express, not straight to Supabase, so the role
  // check happens on the backend where it cannot be bypassed. The Supabase
  // access token is forwarded as the bearer token so the server can verify who
  // is calling and read that user's role from `profiles`.
  async _accessToken() {
    try {
      const { data } = await this.client.auth.getSession();
      return data && data.session ? data.session.access_token : null;
    } catch (e) {
      return null;
    }
  },

  async uploadBookPdf(bookId, file) {
    const token = await this._accessToken();
    if (!token) throw new Error('You must be signed in to upload a PDF.');
    const res = await fetch(
      `/api/books/${encodeURIComponent(bookId)}/pdf?filename=${encodeURIComponent(file.name || 'book.pdf')}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        },
        body: file
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `PDF upload failed (HTTP ${res.status})`);
    return body;
  },

  async removeBookPdf(bookId) {
    const token = await this._accessToken();
    if (!token) throw new Error('You must be signed in to remove a PDF.');
    const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/pdf`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `PDF delete failed (HTTP ${res.status})`);
    return body;
  },

  // ── Digital reading (server-authorized) ───────────────
  // Asks the server whether the signed-in user may open this book's PDF.
  // The answer comes from `borrow_requests` + dates in the database; the
  // browser only mirrors it for display.
  async getBookPdfAccess(bookId) {
    const token = await this._accessToken();
    if (!token) return { canRead: false, status: 'signed_out', message: 'Please sign in to continue.' };
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { canRead: false, status: body.status || 'error', message: body.error || 'Could not check reading access.' };
      }
      return body;
    } catch (e) {
      return { canRead: false, status: 'offline', message: 'Could not reach the library server. Check your connection.' };
    }
  },

  // Downloads the PDF through the protected endpoint. Throws with the
  // server's denial message when reading is not allowed.
  async fetchBookPdfBlob(bookId) {
    const token = await this._accessToken();
    if (!token) throw new Error('Please sign in to read this book.');
    const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || 'You do not have permission to read this book.');
      err.status = res.status;
      err.code = body.status;
      err.externalUrl = body.externalUrl || null;
      throw err;
    }
    return res.blob();
  },

  // ── Categories ────────────────────────────────────────
  async getAllCategories() {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCategory(cat) {
    const { data, error } = await this.client
      .from('categories')
      .insert(cat)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCategory(id, updates) {
    const { data, error } = await this.client
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await this.client
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Borrow Requests ───────────────────────────────────
  async getAllBorrowRequests() {
    const { data, error } = await this.client
      .from('borrow_requests')
      .select('*')
      .order('request_time', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getBorrowRequestsByStudent(studentId) {
    const { data, error } = await this.client
      .from('borrow_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('request_time', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getBorrowRequestsByStatus(status) {
    const { data, error } = await this.client
      .from('borrow_requests')
      .select('*')
      .eq('status', status)
      .order('request_time', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createBorrowRequest(request) {
    const { data, error } = await this.client
      .from('borrow_requests')
      .insert(request)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBorrowRequest(id, updates) {
    const { data, error } = await this.client
      .from('borrow_requests')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    // PostgREST reports a row filtered out by RLS as "0 rows" rather than as an
    // error, so a stale schema or a wrong role used to look like a successful
    // save while nothing changed. Surface it instead of pretending it worked.
    if (!data || data.length === 0) {
      throw new Error('The database did not update this borrow request (row-level security matched 0 rows). Check your Supabase schema and permissions, then try again.');
    }
    return data[0];
  },

  // ── Notifications ─────────────────────────────────────
  async getNotifications(userId) {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createNotification(notif) {
    const { data, error } = await this.client
      .from('notifications')
      .insert(notif)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markNotificationRead(id) {
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllNotificationsRead(userId) {
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  async deleteNotification(id) {
    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Announcements ─────────────────────────────────────
  async getAllAnnouncements() {
    const { data, error } = await this.client
      .from('announcements')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createAnnouncement(ann) {
    const { data, error } = await this.client
      .from('announcements')
      .insert(ann)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAnnouncement(id, updates) {
    const { data, error } = await this.client
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(id) {
    const { error } = await this.client
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Events ────────────────────────────────────────────
  async getAllEvents() {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createEvent(event) {
    const { data, error } = await this.client
      .from('events')
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEvent(id, updates) {
    const { data, error } = await this.client
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteEvent(id) {
    const { error } = await this.client
      .from('events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Reservations ──────────────────────────────────────
  async getAllReservations() {
    const { data, error } = await this.client
      .from('reservations')
      .select('*')
      .order('reserved_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getReservationsByStudent(studentId) {
    const { data, error } = await this.client
      .from('reservations')
      .select('*')
      .eq('student_id', studentId)
      .order('reserved_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createReservation(res) {
    const { data, error } = await this.client
      .from('reservations')
      .insert(res)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateReservation(id, updates) {
    const { data, error } = await this.client
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteReservation(id) {
    const { error } = await this.client
      .from('reservations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Favorites ─────────────────────────────────────────
  async getFavorites(userId) {
    const { data, error } = await this.client
      .from('favorites')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addFavorite(userId, bookId) {
    const { data, error } = await this.client
      .from('favorites')
      .insert({ user_id: userId, book_id: bookId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeFavorite(userId, bookId) {
    const { error } = await this.client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', bookId);
    if (error) throw error;
  },

  async isFavorite(userId, bookId) {
    const { data, error } = await this.client
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  // ── Recently Viewed ───────────────────────────────────
  async getRecentlyViewed(userId) {
    const { data, error } = await this.client
      .from('recently_viewed')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },

  async addRecentlyViewed(userId, bookId) {
    const { error: delErr } = await this.client
      .from('recently_viewed')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', bookId);
    if (delErr) throw delErr;

    const { data, error } = await this.client
      .from('recently_viewed')
      .insert({ user_id: userId, book_id: bookId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Reviews ───────────────────────────────────────────
  // SECURITY: the `profiles` table is no longer readable by every user, so the
  // author name/avatar is resolved through the non-identifying public_profiles
  // view (id, name, avatar) instead of an embedded join on `profiles`.
  async _attachPublicAuthors(reviews) {
    if (!reviews || !reviews.length) return reviews || [];
    const ids = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
    if (!ids.length) return reviews;
    try {
      const { data, error } = await this.client
        .from('public_profiles')
        .select('id, name, avatar')
        .in('id', ids);
      if (error) throw error;
      const byId = new Map((data || []).map(p => [p.id, p]));
      return reviews.map(r => {
        const p = byId.get(r.user_id);
        return { ...r, profiles: p ? { name: p.name, avatar: p.avatar } : null };
      });
    } catch (e) {
      console.warn('Could not load review author names:', e);
      return reviews;
    }
  },

  async getReviewsByBook(bookId) {
    const { data, error } = await this.client
      .from('reviews')
      .select('*, books(title, cover)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return this._attachPublicAuthors(data);
  },

  async getReviewsByUser(userId) {
    const { data, error } = await this.client
      .from('reviews')
      .select('*, books(title, cover)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return this._attachPublicAuthors(data);
  },

  async upsertReview(review) {
    const { data, error } = await this.client
      .from('reviews')
      .upsert(review, { onConflict: 'book_id,user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteReview(id) {
    const { error } = await this.client
      .from('reviews')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Digital Books ─────────────────────────────────────
  async getAllDigitalBooks() {
    const { data, error } = await this.client
      .from('digital_books')
      .select('*')
      .order('added_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createDigitalBook(book) {
    const { data, error } = await this.client
      .from('digital_books')
      .insert(book)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDigitalBook(id, updates) {
    const { data, error } = await this.client
      .from('digital_books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDigitalBook(id) {
    const { error } = await this.client
      .from('digital_books')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Study Materials ───────────────────────────────────
  async getAllStudyMaterials() {
    const { data, error } = await this.client
      .from('study_materials')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createStudyMaterial(material) {
    const { data, error } = await this.client
      .from('study_materials')
      .insert(material)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStudyMaterial(id, updates) {
    const { data, error } = await this.client
      .from('study_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStudyMaterial(id) {
    const { error } = await this.client
      .from('study_materials')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Settings ──────────────────────────────────────────
  async getSetting(key) {
    const { data, error } = await this.client
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? data.value : null;
  },

  async setSetting(key, value) {
    const { data, error } = await this.client
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllSettings() {
    const { data, error } = await this.client
      .from('settings')
      .select('*');
    if (error) throw error;
    const map = {};
    data.forEach(row => { map[row.key] = row.value; });
    return map;
  },

  // ── Achievements ──────────────────────────────────────
  async getAchievements(userId) {
    const { data, error } = await this.client
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addAchievement(achievement) {
    const { data, error } = await this.client
      .from('achievements')
      .insert(achievement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Admin User Management ─────────────────────────────
  async getAllProfiles() {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Helpers ───────────────────────────────────────────
  mapProfile(raw) {
    return {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      role: raw.role,
      grade: raw.grade,
      className: raw.className || raw.classname,
      avatar: raw.avatar,
      borrowCount: raw.borrow_count,
      readingStreak: raw.reading_streak,
      approved: raw.approved,
      createdAt: raw.created_at
    };
  },

  mapBook(raw) {
    return {
      id: raw.id,
      title: raw.title,
      author: raw.author,
      publisher: raw.publisher,
      grade: raw.grade,
      subject: raw.subject,
      language: raw.language,
      pages: raw.pages,
      year: raw.year,
      description: raw.description,
      pdfUrl: raw.pdf_url,
      pdfFilename: raw.pdf_filename || '',
      cover: raw.cover,
      isbn: raw.isbn,
      category: raw.category,
      totalCopies: raw.total_copies,
      availableCopies: raw.available_copies,
      borrowCount: raw.borrow_count,
      rating: raw.rating,
      status: raw.status,
      shelf: raw.shelf,
      rack: raw.rack
    };
  },

  mapBorrowRequest(raw) {
    return {
      id: raw.id,
      bookId: raw.book_id,
      bookTitle: raw.book_title,
      studentId: raw.student_id,
      studentName: raw.student_name,
      borrowDate: raw.borrow_date,
      expectedReturnDate: raw.expected_return_date,
      returnDate: raw.return_date,
      requestTime: raw.request_time,
      status: raw.status,
      approvedBy: raw.approved_by,
      approvedAt: raw.approved_at,
      fine: raw.fine,
      renewed: raw.renewed,
      rejectionReason: raw.rejection_reason
    };
  },

  mapNotification(raw) {
    return {
      id: raw.id,
      userId: raw.user_id,
      type: raw.type,
      title: raw.title,
      message: raw.message,
      icon: raw.icon,
      read: raw.read,
      time: raw.time,
      timestamp: raw.timestamp
    };
  },

  mapAnnouncement(raw) {
    return {
      id: raw.id,
      title: raw.title,
      content: raw.content,
      date: raw.date,
      priority: raw.priority,
      icon: raw.icon,
      active: raw.active
    };
  },

  mapEvent(raw) {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      date: raw.date,
      time: raw.time,
      location: raw.location,
      type: raw.type,
      icon: raw.icon,
      active: raw.active
    };
  },

  mapReservation(raw) {
    return {
      id: raw.id,
      bookId: raw.book_id,
      bookTitle: raw.book_title,
      studentId: raw.student_id,
      studentName: raw.student_name,
      reservedAt: raw.reserved_at,
      status: raw.status,
      expiresAt: raw.expires_at
    };
  },

  mapFavorite(raw) {
    return {
      id: raw.id,
      userId: raw.user_id,
      bookId: raw.book_id,
      createdAt: raw.created_at,
      book: raw.books ? this.mapBook(raw.books) : null
    };
  },

  mapReview(raw) {
    return {
      id: raw.id,
      bookId: raw.book_id,
      userId: raw.user_id,
      rating: raw.rating,
      comment: raw.comment,
      createdAt: raw.created_at,
      user: (raw.profiles || raw.user) ? { name: (raw.profiles || raw.user).name, avatar: (raw.profiles || raw.user).avatar } : null,
      book: raw.books ? { title: raw.books.title, cover: raw.books.cover } : null
    };
  },

  mapDigitalBook(raw) {
    return {
      id: raw.id,
      title: raw.title,
      author: raw.author,
      description: raw.description,
      cover: raw.cover,
      pdfUrl: raw.pdf_url,
      format: raw.format,
      pages: raw.pages,
      category: raw.category,
      addedDate: raw.added_date,
      downloads: raw.downloads,
      featured: raw.featured
    };
  },

  mapStudyMaterial(raw) {
    return {
      id: raw.id,
      title: raw.title,
      type: raw.type,
      grade: raw.grade,
      subject: raw.subject,
      year: raw.year,
      examType: raw.exam_type,
      pdfUrl: raw.pdf_url,
      description: raw.description,
      uploadedBy: raw.uploaded_by,
      uploadedAt: raw.uploaded_at,
      downloads: raw.downloads
    };
  },

  mapProfileAdmin(raw) {
    return {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      role: raw.role,
      grade: raw.grade,
      className: raw.className || raw.classname,
      avatar: raw.avatar,
      borrowCount: raw.borrow_count,
      readingStreak: raw.reading_streak,
      approved: raw.approved,
      createdAt: raw.created_at
    };
  }
};
