window.Api = {
  client: null,

  init() {
    this.client = SupabaseClient.get();
  },

  // ── Auth ──────────────────────────────────────────────
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error('Profile not found for this account. Please contact the administrator.');
    return { user: data.user, profile };
  },

  async signUp(email, password, meta = {}) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: meta }
    });
    if (error) throw error;
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
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
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
    const { data, error } = await this.client
      .from('profiles')
      .update({ approved: true })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async rejectUser(userId) {
    await this.deleteUser(userId);
  },

  async deleteUser(userId) {
    // Try the security-definer RPC first (removes auth user + cascades to profile)
    try {
      const { error } = await this.client.rpc('delete_account', { p_user_id: userId });
      if (!error) return;
      console.warn('delete_account RPC failed, falling back to direct profile delete:', error);
    } catch (e) {
      console.warn('delete_account RPC threw, falling back to direct profile delete:', e);
    }
    // Fallback: delete the profiles row directly
    const { error } = await this.client
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  },

  async deleteAccount(userId) {
    await this.deleteUser(userId);
  },

  async addLibrarian({ email, password, name, role = 'librarian', department }) {
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

  async getAdminAndLibrarians() {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, role')
      .in('role', ['admin', 'librarian']);
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
    return data ? (data[0] || null) : null;
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
  async getReviewsByBook(bookId) {
    const { data, error } = await this.client
      .from('reviews')
      .select('*, profiles(name, avatar)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getReviewsByUser(userId) {
    const { data, error } = await this.client
      .from('reviews')
      .select('*, books(title, cover)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
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
      className: raw.classname,
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
      user: raw.profiles ? { name: raw.profiles.name, avatar: raw.profiles.avatar } : null,
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
      className: raw.classname,
      avatar: raw.avatar,
      borrowCount: raw.borrow_count,
      readingStreak: raw.reading_streak,
      approved: raw.approved,
      createdAt: raw.created_at
    };
  }
};
