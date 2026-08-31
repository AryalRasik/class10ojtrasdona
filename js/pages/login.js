const LoginPage = {
  mode: 'signin',
  selectedRole: 'student',
  signupRole: 'student',
  staffRole: null,
  loading: false,
  passwordVisible: false,
  confirmPasswordVisible: false,
  resetPasswordVisible: false,
  resetConfirmPasswordVisible: false,

  render(params) {
    if (params && params.token) {
      this.mode = 'reset';
    } else if (params && params.mode) {
      this.mode = params.mode;
    }

    if (this.mode === 'staff' && params && params.page) {
      this.staffRole = params.page === 'admin' ? 'admin' : 'librarian';
    }

    const subtitles = {
      signin: 'Sign in to your account',
      signup: 'Create a new account',
      forgot: 'Reset your password',
      reset: 'Set a new password',
      staff: this.staffRole === 'admin' ? 'Admin Sign In' : 'Librarian Sign In'
    };

    const isStaff = this.mode === 'staff';
    const staffIcon = this.staffRole === 'admin' ? 'shield' : 'book-open';
    const staffTitle = this.staffRole === 'admin' ? 'System Admin' : 'Library Staff';
    const icon = isStaff && this.mode === 'staff' ? Utils.getIcon(staffIcon, 36) : Utils.getIcon('book-open', 36);

    return `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);padding:2rem;">
        <div class="card" style="width:100%;max-width:460px;overflow:hidden;">
          <div style="padding:2.5rem 2rem 1.5rem;text-align:center;background:${isStaff ? 'linear-gradient(135deg,#4338ca,var(--primary-dark))' : 'linear-gradient(135deg,var(--primary),var(--primary-dark))'};color:#fff;">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.2);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);">
              ${icon}
            </div>
            <h1 style="margin:0;color:#fff;font-size:1.5rem;">${isStaff ? staffTitle + ' Portal' : 'Saraswati Sec School Library'}</h1>
            <p style="margin:0.25rem 0 0;opacity:0.85;font-size:0.9rem;">${subtitles[this.mode]}</p>
          </div>
          <div style="padding:2rem;">
            ${this.renderForm()}
          </div>
        </div>
      </div>`;
  },

  renderForm() {
    switch (this.mode) {
      case 'signin': return this.renderSignIn();
      case 'signup': return this.renderSignUp();
      case 'forgot': return this.renderForgot();
      case 'reset': return this.renderReset();
      case 'staff': return this.renderStaffSignIn();
      default: return this.renderSignIn();
    }
  },

  renderStaffSignIn() {
    const role = this.staffRole === 'admin' ? 'admin' : 'librarian';
    const roleLabel = this.staffRole === 'admin' ? 'Admin' : 'Librarian';
    return `
      <div class="form-group">
        <label class="form-label">${roleLabel} Email</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('mail', 16)}</span>
          <input class="form-input" type="email" id="login-email" placeholder="${roleLabel.toLowerCase()}@yourlibrary.com" style="padding-left:38px;" autocomplete="email">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="login-password" placeholder="Enter your password" style="padding-left:38px;padding-right:2.5rem;" autocomplete="current-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('login-password')" aria-label="Toggle password visibility">
            ${this.passwordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="signin-btn" style="width:100%;margin-bottom:1rem;" onclick="LoginPage.staffLogin()">
        ${Utils.getIcon('log-in', 16)} Sign In as ${roleLabel}
      </button>

      <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:1rem;">
        <a href="javascript:void(0)" onclick="LoginPage.setMode('signin')" style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
          ${Utils.getIcon('arrow-left', 14)} Back to user sign in
        </a>
      </div>`;
  },

  renderSignIn() {
    return `
      <div class="form-group">
        <label class="form-label">Email</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('mail', 16)}</span>
          <input class="form-input" type="email" id="login-email" placeholder="you@example.com" style="padding-left:38px;" autocomplete="email">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="login-password" placeholder="Enter your password" style="padding-left:38px;padding-right:2.5rem;" autocomplete="current-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('login-password')" aria-label="Toggle password visibility">
            ${this.passwordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;color:var(--text-secondary);">
          <input type="checkbox" id="remember-me" style="accent-color:var(--primary);width:15px;height:15px;"> Remember me
        </label>
        <a href="javascript:void(0)" onclick="LoginPage.setMode('forgot')" style="font-size:0.85rem;color:var(--primary);text-decoration:none;font-weight:500;">Forgot password?</a>
      </div>

      <button class="btn btn-primary btn-lg" id="signin-btn" style="width:100%;margin-bottom:1rem;" onclick="LoginPage.login()">
        ${Utils.getIcon('log-in', 16)} Sign In
      </button>

      <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:1rem;">
        <span style="font-size:0.85rem;color:var(--text-tertiary);">Don't have an account? </span>
        <a href="javascript:void(0)" onclick="LoginPage.setMode('signup')" style="font-size:0.85rem;color:var(--primary);text-decoration:none;font-weight:600;">Sign Up</a>
      </div>`;
  },

  renderSignUp() {
    const isStudent = this.signupRole === 'student';
    return `
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('user', 16)}</span>
          <input class="form-input" type="text" id="signup-name" placeholder="Enter your full name" style="padding-left:38px;" autocomplete="name">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('mail', 16)}</span>
          <input class="form-input" type="email" id="signup-email" placeholder="you@example.com" style="padding-left:38px;" autocomplete="email">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">I am a</label>
        <div style="display:flex;gap:0.5rem;">
          <button type="button" class="btn ${isStudent ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1;" onclick="LoginPage.setSignupRole('student')">
            ${Utils.getIcon('graduation-cap', 14)} Student
          </button>
          <button type="button" class="btn ${!isStudent ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1;" onclick="LoginPage.setSignupRole('teacher')">
            ${Utils.getIcon('briefcase', 14)} Teacher
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${isStudent ? 'Student ID' : 'Teacher ID'}</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('hash', 16)}</span>
          <input class="form-input" type="text" id="signup-id" placeholder="${isStudent ? 'e.g. STU-2026-001' : 'e.g. TCH-2026-001'}" style="padding-left:38px;" autocomplete="off">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${isStudent ? 'Grade / Class' : 'Department'}</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('building', 16)}</span>
          <input class="form-input" type="text" id="signup-extra" placeholder="${isStudent ? 'e.g. 10-A' : 'e.g. Science'}" style="padding-left:38px;" autocomplete="off">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="signup-password" placeholder="Create a password" style="padding-left:38px;padding-right:2.5rem;" oninput="LoginPage.onSignupPasswordInput()" autocomplete="new-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('signup-password')" aria-label="Toggle password visibility">
            ${this.passwordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
        <div id="password-strength" style="margin-top:8px;"></div>
        <div id="password-rules" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="signup-confirm-password" placeholder="Confirm your password" style="padding-left:38px;padding-right:2.5rem;" autocomplete="new-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('signup-confirm-password')" aria-label="Toggle password visibility">
            ${this.confirmPasswordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="signup-btn" style="width:100%;margin-bottom:1rem;" onclick="LoginPage.signup()">
        ${Utils.getIcon('user-plus', 16)} Create Account
      </button>

      <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:1rem;">
        <span style="font-size:0.85rem;color:var(--text-tertiary);">Already have an account? </span>
        <a href="javascript:void(0)" onclick="LoginPage.setMode('signin')" style="font-size:0.85rem;color:var(--primary);text-decoration:none;font-weight:600;">Sign In</a>
      </div>`;
  },

  renderForgot() {
    return `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(102,126,234,0.1);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;">
          ${Utils.getIcon('mail', 28)}
        </div>
        <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.5;">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('mail', 16)}</span>
          <input class="form-input" type="email" id="forgot-email" placeholder="you@example.com" style="padding-left:38px;" autocomplete="email">
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="forgot-btn" style="width:100%;margin-bottom:1rem;" onclick="LoginPage.forgotPassword()">
        ${Utils.getIcon('send', 16)} Send Reset Link
      </button>

      <div id="forgot-confirmation" style="display:none;text-align:center;padding:1rem 0;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.1);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:var(--success);">
          ${Utils.getIcon('check-circle', 28)}
        </div>
        <h3 style="margin-bottom:0.5rem;font-size:1.1rem;">Check your email</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;margin-bottom:0.5rem;">
          We've sent a password reset link to
        </p>
        <p style="font-size:0.85rem;font-weight:600;color:var(--text-primary);" id="forgot-email-display"></p>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.75rem;">
          Didn't receive the email? Check your spam folder or try again.
        </p>
      </div>

      <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:1rem;margin-top:0.5rem;">
        <a href="javascript:void(0)" onclick="LoginPage.setMode('signin')" style="font-size:0.85rem;color:var(--primary);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
          ${Utils.getIcon('arrow-left', 14)} Back to Sign In
        </a>
      </div>`;
  },

  renderReset() {
    return `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(102,126,234,0.1);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;">
          ${Utils.getIcon('key', 28)}
        </div>
        <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.5;">
          Create a new password for your account. Make sure it's strong and unique.
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="reset-password" placeholder="Enter new password" style="padding-left:38px;padding-right:2.5rem;" oninput="LoginPage.onResetPasswordInput()" autocomplete="new-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('reset-password')" aria-label="Toggle password visibility">
            ${this.resetPasswordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
        <div id="reset-strength" style="margin-top:8px;"></div>
        <div id="reset-rules" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;">${Utils.getIcon('lock', 16)}</span>
          <input class="form-input" type="password" id="reset-confirm-password" placeholder="Confirm new password" style="padding-left:38px;padding-right:2.5rem;" autocomplete="new-password">
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);padding:4px;" onclick="LoginPage.togglePassword('reset-confirm-password')" aria-label="Toggle password visibility">
            ${this.resetConfirmPasswordVisible ? Utils.getIcon('eye-off', 16) : Utils.getIcon('eye', 16)}
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="reset-btn" style="width:100%;margin-bottom:1rem;" onclick="LoginPage.resetPassword()">
        ${Utils.getIcon('check', 16)} Reset Password
      </button>

      <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:1rem;">
        <a href="javascript:void(0)" onclick="LoginPage.setMode('signin')" style="font-size:0.85rem;color:var(--primary);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
          ${Utils.getIcon('arrow-left', 14)} Back to Sign In
        </a>
      </div>`;
  },

  setMode(mode) {
    this.mode = mode;
    this.loading = false;
    this.passwordVisible = false;
    this.confirmPasswordVisible = false;
    this.resetPasswordVisible = false;
    this.resetConfirmPasswordVisible = false;
    this.refresh();
  },
  refresh() {
    const content = document.getElementById('pageContent');
    if (content) {
      content.innerHTML = this.render();
      this.afterRender();
    }
  },

  setSignupRole(role) {
    this.signupRole = role;
    this.refresh();
  },

  togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    if (inputId === 'login-password') this.passwordVisible = !isVisible;
    else if (inputId === 'signup-password') this.passwordVisible = !isVisible;
    else if (inputId === 'signup-confirm-password') this.confirmPasswordVisible = !isVisible;
    else if (inputId === 'reset-password') this.resetPasswordVisible = !isVisible;
    else if (inputId === 'reset-confirm-password') this.resetConfirmPasswordVisible = !isVisible;
  },

  setLoading(btnId, isLoading) {
    this.loading = isLoading;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Processing...`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { level: 'weak', label: 'Weak', color: 'var(--danger)', width: '33%' };
    if (score <= 4) return { level: 'medium', label: 'Medium', color: 'var(--warning)', width: '66%' };
    return { level: 'strong', label: 'Strong', color: 'var(--success)', width: '100%' };
  },

  getPasswordRules(password) {
    const rules = [
      { met: password.length >= 8, label: '8+ chars' },
      { met: /[A-Z]/.test(password), label: 'Uppercase' },
      { met: /[a-z]/.test(password), label: 'Lowercase' },
      { met: /[0-9]/.test(password), label: 'Number' }
    ];
    return rules;
  },

  renderStrengthMeter(password, containerId, rulesId) {
    const strengthEl = document.getElementById(containerId);
    const rulesEl = document.getElementById(rulesId);
    if (!strengthEl || !rulesEl) return;

    if (!password) {
      strengthEl.innerHTML = '';
      rulesEl.innerHTML = '';
      return;
    }

    const strength = this.getPasswordStrength(password);
    strengthEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${strength.width};background:${strength.color};border-radius:2px;transition:all 0.3s ease;"></div>
        </div>
        <span style="font-size:0.75rem;font-weight:600;color:${strength.color};">${strength.label}</span>
      </div>`;

    const rules = this.getPasswordRules(password);
    rulesEl.innerHTML = rules.map(r =>
      `<span style="font-size:0.7rem;padding:2px 8px;border-radius:var(--radius-full);background:${r.met ? 'rgba(16,185,129,0.1)' : 'var(--bg-tertiary)'};color:${r.met ? 'var(--success)' : 'var(--text-tertiary)'};font-weight:500;display:inline-flex;align-items:center;gap:3px;">
        ${r.met ? Utils.getIcon('check', 10) : ''}
        ${r.label}
      </span>`
    ).join('');
  },

  onSignupPasswordInput() {
    const pw = document.getElementById('signup-password');
    if (pw) this.renderStrengthMeter(pw.value, 'password-strength', 'password-rules');
  },

  onResetPasswordInput() {
    const pw = document.getElementById('reset-password');
    if (pw) this.renderStrengthMeter(pw.value, 'reset-strength', 'reset-rules');
  },

  async login() {
    if (this.loading) return;

    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value.trim() : '';

    if (!email) { Toast.error('Please enter your email'); emailEl && emailEl.focus(); return; }
    if (!this.validateEmail(email)) { Toast.error('Please enter a valid email address'); emailEl && emailEl.focus(); return; }
    if (!password) { Toast.error('Please enter your password'); passwordEl && passwordEl.focus(); return; }

    if (AppState.isSupabaseConnected) {
      this.setLoading('signin-btn', true);
      try {
        const { user, profile } = await Api.signIn(email, password);
        if (profile.approved === false) {
          Toast.error('Your account is pending approval. Please wait for admin/librarian to approve your registration.');
          await Api.signOut();
          return;
        }
        if (profile.role === 'admin' || profile.role === 'librarian') {
          Toast.error('Please use the ' + (profile.role === 'admin' ? '#/admin' : '#/librarian') + ' portal to sign in.');
          await Api.signOut();
          return;
        }
        AppState.currentUser = Api.mapProfile(profile);
        AppState.isLoggedIn = true;
        await AppState.persistSession(Api.mapProfile(profile));
        await AppState.loadFromSupabase();
        Toast.success(`Welcome, ${AppState.currentUser.name}!`);
        const role = AppState.currentUser.role;
        App.updateUserInfo();
        App.buildSidebar();
        window.location.hash = '#/';
      } catch (e) {
        Toast.error(e.message || 'Sign in failed. Please check your credentials.');
      } finally {
        this.setLoading('signin-btn', false);
      }
    } else {
      this.setLoading('signin-btn', true);
      try {
        const storedUsers = this.getStoredUsers();
        const user = storedUsers.find(u => u.email === email && u.password === password);
        if (user) {
          if (user.approved === false) {
            Toast.error('Your account is pending approval. Please wait for admin/librarian to approve your registration.');
            this.setLoading('signin-btn', false);
            return;
          }
          if (user.role === 'admin' || user.role === 'librarian') {
            Toast.error('Please use the ' + (user.role === 'admin' ? '#/admin' : '#/librarian') + ' portal to sign in.');
            this.setLoading('signin-btn', false);
            return;
          }
          const { password: _, ...safeUser } = user;
          AppState.setUser(safeUser);
          Toast.success(`Welcome, ${safeUser.name}!`);
          App.updateUserInfo();
          App.buildSidebar();
          window.location.hash = '#/';
          return;
        }
        Toast.error('Invalid email or password');
      } catch (e) {
        Toast.error('Sign in failed. Please try again.');
      }
      this.setLoading('signin-btn', false);
    }
  },

  async staffLogin() {
    if (this.loading) return;
    const expectedRole = this.staffRole === 'admin' ? 'admin' : 'librarian';

    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value.trim() : '';

    if (!email) { Toast.error('Please enter your email'); emailEl && emailEl.focus(); return; }
    if (!this.validateEmail(email)) { Toast.error('Please enter a valid email address'); emailEl && emailEl.focus(); return; }
    if (!password) { Toast.error('Please enter your password'); passwordEl && passwordEl.focus(); return; }

    if (AppState.isSupabaseConnected) {
      this.setLoading('signin-btn', true);
      try {
        const { user, profile } = await Api.signIn(email, password);
        if (profile.approved === false) {
          Toast.error('Your account is pending approval.');
          await Api.signOut();
          return;
        }
        if (profile.role !== expectedRole) {
          Toast.error('Access denied: This login is only for ' + (expectedRole === 'admin' ? 'Admin accounts.' : 'Librarian accounts.') + ' Please use the correct portal.');
          await Api.signOut();
          return;
        }
        AppState.currentUser = Api.mapProfile(profile);
        AppState.isLoggedIn = true;
        await AppState.persistSession(Api.mapProfile(profile));
        await AppState.loadFromSupabase();
        Toast.success(`Welcome, ${AppState.currentUser.name}!`);
        App.updateUserInfo();
        App.buildSidebar();
        window.location.hash = '#/dashboard';
      } catch (e) {
        Toast.error(e.message || 'Sign in failed. Please check your credentials.');
      } finally {
        this.setLoading('signin-btn', false);
      }
    } else {
      this.setLoading('signin-btn', true);
      try {
        const storedUsers = this.getStoredUsers();
        const user = storedUsers.find(u => u.email === email && u.password === password);
        if (user && user.approved !== false && user.role === expectedRole) {
          const { password: _, ...safeUser } = user;
          AppState.setUser(safeUser);
          Toast.success(`Welcome, ${safeUser.name}!`);
          App.updateUserInfo();
          App.buildSidebar();
          window.location.hash = '#/dashboard';
          return;
        }
        Toast.error('Access denied. Invalid credentials or wrong portal for your role.');
      } catch (e) {
        Toast.error('Sign in failed. Please try again.');
      }
      this.setLoading('signin-btn', false);
    }
  },

  async signup() {
    if (this.loading) return;

    const nameEl = document.getElementById('signup-name');
    const emailEl = document.getElementById('signup-email');
    const idEl = document.getElementById('signup-id');
    const extraEl = document.getElementById('signup-extra');
    const passwordEl = document.getElementById('signup-password');
    const confirmEl = document.getElementById('signup-confirm-password');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const userId = idEl ? idEl.value.trim() : '';
    const extra = extraEl ? extraEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value.trim() : '';
    const confirmPassword = confirmEl ? confirmEl.value.trim() : '';

    if (!name) { Toast.error('Please enter your full name'); nameEl && nameEl.focus(); return; }
    if (!email) { Toast.error('Please enter your email'); emailEl && emailEl.focus(); return; }
    if (!this.validateEmail(email)) { Toast.error('Please enter a valid email address'); emailEl && emailEl.focus(); return; }
    if (!userId) { Toast.error(`Please enter your ${this.signupRole === 'student' ? 'Student' : 'Teacher'} ID`); idEl && idEl.focus(); return; }
    if (!extra) { Toast.error(`Please enter your ${this.signupRole === 'student' ? 'Grade/Class' : 'Department'}`); extraEl && extraEl.focus(); return; }

    const strength = this.getPasswordStrength(password);
    if (strength.level === 'weak') {
      Toast.error('Password is too weak. Please make it stronger.');
      passwordEl && passwordEl.focus();
      return;
    }

    if (password !== confirmPassword) {
      Toast.error('Passwords do not match');
      confirmEl && confirmEl.focus();
      return;
    }

    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const role = this.signupRole;

    const userData = {
      name,
      email,
      role,
      id: Date.now().toString(),
      avatar,
      ...(role === 'student' ? { grade: extra, className: extra } : {}),
      ...(role === 'teacher' ? { department: extra } : {}),
      userId
    };

    if (AppState.isSupabaseConnected) {
      this.setLoading('signup-btn', true);
      try {
        const { data } = await Api.signUp(email, password, {
          name,
          role,
          user_id: userId,
          ...(role === 'student' ? { grade: extra } : { department: extra })
        });

        if (data && data.user) {
          const staffList = await Api.getAdminAndLibrarians();
          const notifPromises = staffList.map(staff =>
            Api.createNotification({
              user_id: staff.id,
              type: 'info',
              title: 'New Registration Request',
              message: `${name} (${role}) has registered and is awaiting approval. Email: ${email}`,
              icon: 'user-plus',
              read: false,
              time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            })
          );
          await Promise.all(notifPromises);
        }

        Toast.success('Account created! Your registration is pending approval by admin/librarian. You will be able to sign in once approved.');
        this.setMode('signin');
      } catch (e) {
        Toast.error(e.message || 'Sign up failed');
      } finally {
        this.setLoading('signup-btn', false);
      }
    } else {
      this.setLoading('signup-btn', true);
      try {
        const storedUsers = this.getStoredUsers();
        if (storedUsers.find(u => u.email === email)) {
          Toast.error('Email already registered');
          this.setLoading('signup-btn', false);
          return;
        }
        const newUser = { ...userData, password, approved: false, createdAt: new Date().toISOString(), borrowCount: 0, readingStreak: 0 };
        storedUsers.push(newUser);
        localStorage.setItem('library_users', JSON.stringify(storedUsers));
        Toast.success('Account created! Your registration is pending approval. You will be able to sign in once approved by admin/librarian.');
        this.setMode('signin');
        return;
      } catch (e) {
        Toast.error('Sign up failed. Please try again.');
      }
      this.setLoading('signup-btn', false);
    }
  },

  async forgotPassword() {
    if (this.loading) return;

    const emailEl = document.getElementById('forgot-email');
    const email = emailEl ? emailEl.value.trim() : '';

    if (!email) { Toast.error('Please enter your email address'); emailEl && emailEl.focus(); return; }
    if (!this.validateEmail(email)) { Toast.error('Please enter a valid email address'); emailEl && emailEl.focus(); return; }

    if (AppState.isSupabaseConnected) {
      this.setLoading('forgot-btn', true);
      try {
        await this.client?.auth?.resetPasswordForEmail?.(email);
        Toast.success('Password reset link sent!');
      } catch (e) {
        Toast.info('If an account exists with this email, a reset link has been sent.');
      } finally {
        this.setLoading('forgot-btn', false);
      }
    } else {
      this.setLoading('forgot-btn', true);
      try {
        const storedUsers = this.getStoredUsers();
        const user = storedUsers.find(u => u.email === email);

        if (user) {
          const token = btoa(email + ':' + Date.now());
          const resetTokens = JSON.parse(localStorage.getItem('library_reset_tokens') || '{}');
          resetTokens[token] = { email, createdAt: Date.now() };
          localStorage.setItem('library_reset_tokens', JSON.stringify(resetTokens));
        }

        const formContainer = document.querySelector('.card > div:last-child');
        if (formContainer) {
          const formGroups = formContainer.querySelectorAll('.form-group');
          formGroups.forEach(g => g.style.display = 'none');
          const btn = document.getElementById('forgot-btn');
          if (btn) btn.style.display = 'none';
          const confirmation = document.getElementById('forgot-confirmation');
          const emailDisplay = document.getElementById('forgot-email-display');
          if (confirmation) {
            confirmation.style.display = 'block';
            if (emailDisplay) emailDisplay.textContent = email;
          }
        }
        Toast.success('If an account exists with this email, a reset link has been sent.');
      } catch (e) {
        Toast.info('If an account exists with this email, a reset link has been sent.');
      }
      this.setLoading('forgot-btn', false);
    }
  },

  async resetPassword() {
    if (this.loading) return;

    const passwordEl = document.getElementById('reset-password');
    const confirmEl = document.getElementById('reset-confirm-password');
    const password = passwordEl ? passwordEl.value.trim() : '';
    const confirmPassword = confirmEl ? confirmEl.value.trim() : '';

    if (!password) { Toast.error('Please enter a new password'); passwordEl && passwordEl.focus(); return; }

    const strength = this.getPasswordStrength(password);
    if (strength.level === 'weak') {
      Toast.error('Password is too weak. Please make it stronger.');
      passwordEl && passwordEl.focus();
      return;
    }

    if (password !== confirmPassword) {
      Toast.error('Passwords do not match');
      confirmEl && confirmEl.focus();
      return;
    }

    this.setLoading('reset-btn', true);

    try {
      const hash = window.location.hash;
      const match = hash.match(/token=([^&]*)/);
      const token = match ? match[1] : null;

      if (AppState.isSupabaseConnected) {
        Toast.success('Password has been reset successfully! Please sign in.');
        this.setMode('signin');
      } else {
        if (token) {
          const resetTokens = JSON.parse(localStorage.getItem('library_reset_tokens') || '{}');
          const tokenData = resetTokens[token];

          if (tokenData && (Date.now() - tokenData.createdAt < 3600000)) {
            const storedUsers = this.getStoredUsers();
            const userIdx = storedUsers.findIndex(u => u.email === tokenData.email);
            if (userIdx !== -1) {
              storedUsers[userIdx].password = password;
              localStorage.setItem('library_users', JSON.stringify(storedUsers));
            }
            delete resetTokens[token];
            localStorage.setItem('library_reset_tokens', JSON.stringify(resetTokens));
          }
        }

        Toast.success('Password has been reset successfully! Please sign in.');
        this.setMode('signin');
      }
    } catch (e) {
      Toast.error(e.message || 'Failed to reset password');
    } finally {
      this.setLoading('reset-btn', false);
    }
  },

  getStoredUsers() {
    try {
      return JSON.parse(localStorage.getItem('library_users') || '[]');
    } catch (e) {
      return [];
    }
  },

  afterRender() {
    const emailInput = document.getElementById('login-email');
    if (emailInput) {
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const pw = document.getElementById('login-password');
          if (pw) pw.focus();
        }
      });
    }
    const pwInput = document.getElementById('login-password');
    if (pwInput) {
      pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (this.mode === 'staff') this.staffLogin();
          else this.login();
        }
      });
    }

    const signupConfirm = document.getElementById('signup-confirm-password');
    if (signupConfirm) {
      signupConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.signup();
      });
    }

    const forgotEmail = document.getElementById('forgot-email');
    if (forgotEmail) {
      forgotEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.forgotPassword();
      });
    }

    const resetConfirm = document.getElementById('reset-confirm-password');
    if (resetConfirm) {
      resetConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.resetPassword();
      });
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    if (!document.getElementById('login-page-styles')) {
      style.id = 'login-page-styles';
      document.head.appendChild(style);
    }
  }
};
