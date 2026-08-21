import { z } from 'zod';

export const PhoneAppIdSchema = z.enum([
  'phone', 'messages', 'contacts', 'maps', 'vehicles', 'bank', 'tasks',
  'jobs', 'mail', 'notes', 'camera', 'gallery', 'settings'
]);

export const PhoneThemeSchema = z.enum(['dark', 'light']);
export const PhoneWallpaperSchema = z.enum(['dorado', 'midnight', 'coast', 'graphite']);
export const PhoneNetworkSchema = z.enum(['offline', 'lte', '5g', 'wifi']);

export const PhoneSettingsSchema = z.object({
  theme: PhoneThemeSchema,
  wallpaper: PhoneWallpaperSchema,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  uiScale: z.number().min(0.85).max(1.15),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
  doNotDisturb: z.boolean(),
  airplaneMode: z.boolean(),
  showNotificationPreviews: z.boolean(),
  homeLayout: z.array(PhoneAppIdSchema).min(4).max(13)
});

export const PhoneDeviceSchema = z.object({
  id: z.uuid(),
  inventoryItemId: z.uuid(),
  phoneNumber: z.string().min(5).max(32),
  deviceName: z.string().min(1).max(40),
  batteryPercent: z.number().int().min(0).max(100),
  charging: z.boolean(),
  signalBars: z.number().int().min(0).max(4),
  network: PhoneNetworkSchema,
  settings: PhoneSettingsSchema
});

export const PhoneContactSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  phoneNumber: z.string().min(3).max(32),
  favorite: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const PhoneMessageSchema = z.object({
  id: z.uuid(),
  sender: z.enum(['player', 'contact', 'system']),
  body: z.string().min(1).max(2000),
  createdAt: z.iso.datetime(),
  read: z.boolean()
});

export const PhoneThreadSchema = z.object({
  id: z.uuid(),
  contactId: z.uuid().nullable(),
  title: z.string().min(1).max(100),
  phoneNumber: z.string().max(32),
  unreadCount: z.number().int().nonnegative(),
  messages: z.array(PhoneMessageSchema)
});

export const PhoneNotificationSchema = z.object({
  id: z.uuid(),
  appId: PhoneAppIdSchema,
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  createdAt: z.iso.datetime(),
  read: z.boolean()
});

export const PhoneTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(160),
  completed: z.boolean(),
  source: z.string().min(1).max(60),
  dueAt: z.iso.datetime().nullable()
});

export const PhoneNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  body: z.string().max(5000),
  pinned: z.boolean(),
  updatedAt: z.iso.datetime()
});

export const PhoneStateSchema = z.object({
  device: PhoneDeviceSchema,
  contacts: z.array(PhoneContactSchema),
  threads: z.array(PhoneThreadSchema),
  notifications: z.array(PhoneNotificationSchema),
  tasks: z.array(PhoneTaskSchema),
  notes: z.array(PhoneNoteSchema)
});

export const PhoneSettingsPatchSchema = PhoneSettingsSchema.partial().refine(
  value => Object.keys(value).length > 0,
  'At least one phone setting is required.'
);

export const PhoneSendMessageRequestSchema = z.object({
  threadId: z.uuid(),
  body: z.string().trim().min(1).max(2000)
});

export const PhoneReadNotificationRequestSchema = z.object({
  notificationId: z.uuid().optional(),
  all: z.boolean().optional()
}).refine(value => Boolean(value.notificationId) || value.all === true, 'notificationId or all=true is required');

export const PhoneToggleTaskRequestSchema = z.object({
  taskId: z.uuid(),
  completed: z.boolean()
});

export const PhoneSaveNoteRequestSchema = z.object({
  noteId: z.uuid().optional(),
  title: z.string().trim().min(1).max(100),
  body: z.string().max(5000),
  pinned: z.boolean().default(false)
});

export type PhoneAppId = z.infer<typeof PhoneAppIdSchema>;
export type PhoneTheme = z.infer<typeof PhoneThemeSchema>;
export type PhoneWallpaper = z.infer<typeof PhoneWallpaperSchema>;
export type PhoneNetwork = z.infer<typeof PhoneNetworkSchema>;
export type PhoneSettings = z.infer<typeof PhoneSettingsSchema>;
export type PhoneDevice = z.infer<typeof PhoneDeviceSchema>;
export type PhoneContact = z.infer<typeof PhoneContactSchema>;
export type PhoneMessage = z.infer<typeof PhoneMessageSchema>;
export type PhoneThread = z.infer<typeof PhoneThreadSchema>;
export type PhoneNotification = z.infer<typeof PhoneNotificationSchema>;
export type PhoneTask = z.infer<typeof PhoneTaskSchema>;
export type PhoneNote = z.infer<typeof PhoneNoteSchema>;
