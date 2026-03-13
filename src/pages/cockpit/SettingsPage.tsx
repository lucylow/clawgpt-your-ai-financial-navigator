export default function SettingsPage() {
  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                defaultValue="user@example.com"
                className="w-full h-10 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Display Name</label>
              <input
                type="text"
                defaultValue="Claw User"
                className="w-full h-10 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded border-border" defaultChecked />
              <span className="text-sm text-foreground">Enable notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded border-border" defaultChecked disabled />
              <span className="text-sm text-muted-foreground">Dark mode (always on)</span>
            </label>
          </div>
        </div>

        <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
