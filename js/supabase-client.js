window.SupabaseClient = {
  client: null,

  init(url, key) {
    if (this.client) return this.client;
    this.client = window.supabase.createClient(url, key);
    return this.client;
  },

  get() {
    return this.client;
  }
};
