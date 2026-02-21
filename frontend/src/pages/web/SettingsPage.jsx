import * as React from 'react'
import { useAuth, useTheme } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { authService } from '@/services'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  FormField,
  Avatar,
  Badge,
  Select,
} from '@/components/common'
import {
  Settings,
  User,
  Palette,
  Bell,
  Shield,
  LogOut,
  Save,
  Moon,
  Sun,
  Monitor,
  Mail,
  Key,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

/**
 * Settings page component (web)
 */
export default function SettingsPage() {
  const [activeSection, setActiveSection] = React.useState('profile')

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Download },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="pt-6">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && <ProfileSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'security' && <SecuritySection />}
          {activeSection === 'data' && <DataSection />}
        </div>
      </div>
    </div>
  )
}

/**
 * Profile settings section
 */
function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const fileInputRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatar_url || null)
  const [formData, setFormData] = React.useState({
    username: user?.username || '',
    email: user?.email || '',
  })

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File Too Large', 'Max file size is 2MB.')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Invalid File', 'Only JPG, PNG, GIF, and WebP are allowed.')
      return
    }

    setIsUploading(true)
    try {
      const res = await authService.uploadAvatar(file)
      if (res.success) {
        setAvatarUrl(res.data.avatar_url)
        await refreshUser()
        toast.success('Avatar Updated', 'Your profile picture has been changed.')
      } else {
        toast.error('Upload Failed', res.error || 'Something went wrong.')
      }
    } catch (error) {
      toast.error('Upload Failed', error.message)
    } finally {
      setIsUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      toast.error('Validation Error', 'Username cannot be empty.')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Validation Error', 'Email cannot be empty.')
      return
    }

    setIsLoading(true)
    try {
      const res = await authService.updateProfile({
        username: formData.username.trim(),
        email: formData.email.trim(),
      })
      if (res.success) {
        await refreshUser()
        toast.success('Profile Updated', 'Your profile has been saved.')
      } else {
        toast.error('Update Failed', res.error || 'Something went wrong.')
      }
    } catch (error) {
      toast.error('Update Failed', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={avatarUrl} name={user?.username} size="xl" />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading…' : 'Change Avatar'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, GIF or WebP. Max size 2MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Username">
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your username"
              />
            </FormField>

            <FormField label="Email">
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Appearance settings section
 */
function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preferences' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the app looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h4 className="text-sm font-medium mb-4">Theme</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {themes.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                    theme === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      theme === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Current theme indicator */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <span className="text-sm">Currently using:</span>
          <Badge variant="outline" className="capitalize">
            {resolvedTheme} theme
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Notifications settings section
 */
function NotificationsSection() {
  const toast = useToast()
  const [settings, setSettings] = React.useState({
    emailNotifications: true,
    weeklyReports: false,
    analysisReminders: true,
    achievementAlerts: true,
  })

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    toast.success('Settings Updated', 'Your notification preferences have been saved.')
  }

  const notificationOptions = [
    {
      key: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive important updates via email',
    },
    {
      key: 'weeklyReports',
      title: 'Weekly Reports',
      description: 'Get a summary of your emotional progress each week',
    },
    {
      key: 'analysisReminders',
      title: 'Analysis Reminders',
      description: 'Reminder to log your emotions daily',
    },
    {
      key: 'achievementAlerts',
      title: 'Achievement Alerts',
      description: 'Notifications when you unlock achievements',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Manage how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div>
                <p className="font-medium text-sm">{option.title}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <button
                onClick={() => handleToggle(option.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[option.key] ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Security settings section
 */
function SecuritySection() {
  const { logout } = useAuth()
  const toast = useToast()
  const [showPasswordForm, setShowPasswordForm] = React.useState(false)
  const [passwords, setPasswords] = React.useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [isLoading, setIsLoading] = React.useState(false)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      toast.error('Error', 'New passwords do not match.')
      return
    }
    setIsLoading(true)
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Password Changed', 'Your password has been updated.')
      setShowPasswordForm(false)
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (error) {
      toast.error('Error', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Manage your account security</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Section */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Password</p>
                <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              Change
            </Button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              <FormField label="Current Password">
                <Input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </FormField>
              <FormField label="New Password">
                <Input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                  placeholder="Enter new password"
                />
              </FormField>
              <FormField label="Confirm New Password">
                <Input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={isLoading}>
                  Update Password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Active Sessions */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Manage your logged-in devices</p>
              </div>
            </div>
            <Badge variant="outline">1 active</Badge>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">Sign Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Data & Privacy settings section
 */
function DataSection() {
  const { logout } = useAuth()
  const toast = useToast()
  const [isExporting, setIsExporting] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [deletePassword, setDeletePassword] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const res = await authService.exportData()
      if (res.success) {
        // Trigger JSON file download
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `innervoice-data-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Export Complete', 'Your data has been downloaded.')
      } else {
        toast.error('Export Failed', res.error || 'Something went wrong.')
      }
    } catch (error) {
      toast.error('Export Failed', error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Password Required', 'Enter your password to confirm deletion.')
      return
    }

    setIsDeleting(true)
    try {
      const res = await authService.deleteAccount(deletePassword)
      if (res.success) {
        toast.success('Account Deleted', 'Your account has been permanently deleted.')
        // Redirect via logout (storage already cleared by authService)
        await logout()
      } else {
        toast.error('Deletion Failed', res.error || 'Something went wrong.')
      }
    } catch (error) {
      toast.error('Deletion Failed', error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Privacy</CardTitle>
        <CardDescription>Manage your data and privacy settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Data */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Export Your Data</p>
                <p className="text-xs text-muted-foreground">
                  Download all your analyses and account data as JSON
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting…
                </>
              ) : (
                'Export'
              )}
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    This action is irreversible
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All your posts, analyses, rewrites, progress data, and account will be
                    permanently deleted. Enter your password to confirm.
                  </p>
                </div>
              </div>
              <FormField label="Confirm Password">
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletePassword('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
