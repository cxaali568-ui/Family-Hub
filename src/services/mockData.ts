import {
  User,
  Family,
  FamilyMembership,
  Message,
  FamilyExpense,
  FamilyBill,
  MedicalRecord,
  UrgentItem,
  FamilyPlan,
  FamilyNote,
  PersonalExpense,
  PersonalTask,
  PersonalNote,
  AppNotification,
  ActivityLog,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-tariq',
    name: 'Tariq Khan',
    email: 'tariq.khan@familyhub.local',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    roleInFamily: 'owner',
    status: 'online',
    bio: 'Dad • Family Organizer • Software Architect',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'user-ayesha',
    name: 'Ayesha Khan',
    email: 'ayesha.khan@familyhub.local',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
    roleInFamily: 'admin',
    status: 'online',
    bio: 'Mom • Pediatrician • Home Chef',
    createdAt: '2026-01-15T08:05:00.000Z',
  },
  {
    id: 'user-zayd',
    name: 'Zayd Khan',
    email: 'zayd.khan@familyhub.local',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
    roleInFamily: 'member',
    status: 'away',
    bio: '11th Grade • Robotics & Soccer',
    createdAt: '2026-01-16T12:00:00.000Z',
  },
  {
    id: 'user-fatima',
    name: 'Fatima Khan',
    email: 'fatima.khan@familyhub.local',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
    roleInFamily: 'member',
    status: 'offline',
    bio: '5th Grade • Art & Swimming',
    createdAt: '2026-01-16T12:30:00.000Z',
  },
];

export const INITIAL_FAMILY: Family = {
  id: 'fam-khan-90210',
  name: 'Khan Family',
  inviteCode: 'KHAN77',
  createdBy: 'user-tariq',
  avatar: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&h=400&q=80',
  createdAt: '2026-01-15T08:00:00.000Z',
  updatedAt: '2026-09-28T09:00:00.000Z',
  settings: {
    allowMemberInvites: true,
    currency: 'USD',
    emergencyNumber: '911',
  },
};

export const INITIAL_MEMBERSHIPS: FamilyMembership[] = [
  { id: 'mem-1', familyId: 'fam-khan-90210', userId: 'user-tariq', role: 'owner', joinedAt: '2026-01-15T08:00:00.000Z', status: 'active' },
  { id: 'mem-2', familyId: 'fam-khan-90210', userId: 'user-ayesha', role: 'admin', joinedAt: '2026-01-15T08:05:00.000Z', status: 'active' },
  { id: 'mem-3', familyId: 'fam-khan-90210', userId: 'user-zayd', role: 'member', joinedAt: '2026-01-16T12:00:00.000Z', status: 'active' },
  { id: 'mem-4', familyId: 'fam-khan-90210', userId: 'user-fatima', role: 'member', joinedAt: '2026-01-16T12:30:00.000Z', status: 'active' },
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-pinned-1',
    chatRoomId: 'room-main',
    senderId: 'user-tariq',
    senderName: 'Tariq Khan',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    text: '📌 Family Notice: Home Wi-Fi key is updated to "KhanHome2026!". Emergency contact is Dr. Farooq at (555) 998-1122.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isPinned: true,
    reactions: { '❤️': ['user-ayesha', 'user-zayd'] },
  },
  {
    id: 'msg-1',
    chatRoomId: 'room-main',
    senderId: 'user-ayesha',
    senderName: 'Ayesha Khan',
    senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
    text: 'Good morning everyone! Remember Fatima has her pediatric dental checkup today at 4:30 PM. Who can pick her up from school?',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    reactions: { '👍': ['user-tariq'] },
  },
  {
    id: 'msg-2',
    chatRoomId: 'room-main',
    senderId: 'user-tariq',
    senderName: 'Tariq Khan',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    text: 'I have a meeting ending at 3:45 PM, so I will pick Fatima up and take her to the clinic.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    replyTo: {
      id: 'msg-1',
      senderName: 'Ayesha Khan',
      text: 'Good morning everyone! Remember Fatima has her pediatric dental checkup today...',
    },
    reactions: { '❤️': ['user-ayesha', 'user-fatima'] },
  },
  {
    id: 'msg-3',
    chatRoomId: 'room-main',
    senderId: 'user-zayd',
    senderName: 'Zayd Khan',
    senderAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
    text: 'Dad, can you please pick up organic milk and sourdough bread from Trader Joe’s if you pass by?',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    attachments: [
      {
        id: 'att-1',
        fileName: 'requested_bread.jpg',
        fileType: 'image',
        fileSize: 420000,
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
        previewUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
      },
    ],
  },
  {
    id: 'msg-4',
    chatRoomId: 'room-main',
    senderId: 'user-tariq',
    senderName: 'Tariq Khan',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    text: 'Got it Zayd! Added to the grocery list. See you all soon! 🚗',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    reactions: { '👏': ['user-zayd'] },
  },
];

export const INITIAL_EXPENSES: FamilyExpense[] = [
  { id: 'exp-1', familyId: 'fam-khan-90210', title: 'Whole Foods Grocery Run', amount: 142.80, paidByUserId: 'user-tariq', paidByName: 'Tariq Khan', category: 'Groceries', date: '2026-09-26' },
  { id: 'exp-2', familyId: 'fam-khan-90210', title: 'Water & Power Monthly Bill', amount: 89.40, paidByUserId: 'user-ayesha', paidByName: 'Ayesha Khan', category: 'Utilities', date: '2026-09-24' },
  { id: 'exp-3', familyId: 'fam-khan-90210', title: 'Zayd Robotics Club Dues', amount: 65.00, paidByUserId: 'user-tariq', paidByName: 'Tariq Khan', category: 'Education', date: '2026-09-20' },
  { id: 'exp-4', familyId: 'fam-khan-90210', title: 'Family Weekend Pizza Night', amount: 54.20, paidByUserId: 'user-ayesha', paidByName: 'Ayesha Khan', category: 'Dining', date: '2026-09-27' },
];

export const INITIAL_BILLS: FamilyBill[] = [
  { id: 'bill-1', familyId: 'fam-khan-90210', title: 'High Speed Fiber Internet', amount: 75.00, dueDate: '2026-10-02', category: 'Utilities', isPaid: false, recurringMonthly: true },
  { id: 'bill-2', familyId: 'fam-khan-90210', title: 'Family Health Insurance Co-pay', amount: 220.00, dueDate: '2026-10-05', category: 'Healthcare', isPaid: false, recurringMonthly: true },
  { id: 'bill-3', familyId: 'fam-khan-90210', title: 'Electricity & Gas Grid', amount: 135.50, dueDate: '2026-09-25', category: 'Utilities', isPaid: true, paidDate: '2026-09-24', paidByUserId: 'user-ayesha', recurringMonthly: true },
];

export const INITIAL_MEDICAL: MedicalRecord[] = [
  {
    id: 'med-fatima',
    familyId: 'fam-khan-90210',
    memberId: 'user-fatima',
    memberName: 'Fatima Khan',
    bloodGroup: 'B+',
    allergies: ['Peanuts (mild)', 'Penicillin'],
    chronicConditions: ['Seasonal Allergic Rhinitis'],
    medications: [
      { name: 'Cetirizine (Children)', dosage: '5mg', frequency: 'As needed for pollen season' },
    ],
    primaryDoctor: { name: 'Dr. Sarah Farooq', phone: '(555) 998-1122', clinic: 'Green Valley Pediatrics' },
    lastCheckupDate: '2026-05-10',
    notes: 'Dental cleaning scheduled for today at 4:30 PM.',
  },
  {
    id: 'med-zayd',
    familyId: 'fam-khan-90210',
    memberId: 'user-zayd',
    memberName: 'Zayd Khan',
    bloodGroup: 'O+',
    allergies: ['No known allergies'],
    chronicConditions: ['None'],
    medications: [],
    primaryDoctor: { name: 'Dr. Sarah Farooq', phone: '(555) 998-1122', clinic: 'Green Valley Pediatrics' },
    lastCheckupDate: '2026-07-14',
    notes: 'Sports clearance form signed for varsity robotics/soccer.',
  },
  {
    id: 'med-tariq',
    familyId: 'fam-khan-90210',
    memberId: 'user-tariq',
    memberName: 'Tariq Khan',
    bloodGroup: 'A+',
    allergies: ['Shellfish'],
    chronicConditions: ['Mild Hypertension'],
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily every morning' },
    ],
    primaryDoctor: { name: 'Dr. Robert Chen', phone: '(555) 441-8899', clinic: 'Memorial Family Clinic' },
    lastCheckupDate: '2026-03-22',
  },
];

export const INITIAL_URGENT: UrgentItem[] = [
  {
    id: 'urg-1',
    familyId: 'fam-khan-90210',
    title: 'Fatima Dental Pick-up at 4:30 PM',
    description: 'Tariq is picking her up from school at 3:45 PM. Clinic is on 4th & Main.',
    severity: 'alert',
    createdByUserId: 'user-ayesha',
    createdByName: 'Ayesha Khan',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    resolved: false,
  },
];

export const INITIAL_PLANS: FamilyPlan[] = [
  {
    id: 'plan-1',
    familyId: 'fam-khan-90210',
    title: 'Fatima Dental Appointment',
    date: '2026-09-28',
    time: '4:30 PM',
    location: 'Green Valley Dental Suite #204',
    category: 'doctor',
    attendees: ['Tariq Khan', 'Fatima Khan'],
  },
  {
    id: 'plan-2',
    familyId: 'fam-khan-90210',
    title: 'Zayd Robotics Tournament Regional Match',
    date: '2026-10-03',
    time: '9:00 AM',
    location: 'Civic High School Auditorium',
    category: 'school',
    attendees: ['Tariq Khan', 'Ayesha Khan', 'Zayd Khan', 'Fatima Khan'],
  },
  {
    id: 'plan-3',
    familyId: 'fam-khan-90210',
    title: 'Family Autumn Weekend Hike & Picnic',
    date: '2026-10-10',
    time: '11:00 AM',
    location: 'Pine Crest National Park',
    category: 'gathering',
    attendees: ['Whole Family'],
  },
];

export const INITIAL_NOTES: FamilyNote[] = [
  {
    id: 'note-1',
    familyId: 'fam-khan-90210',
    title: 'Household Emergency Contacts & Codes',
    content: '• Emergency: 911\n• Pediatrician Dr. Farooq: (555) 998-1122\n• Home alarm code: #4489\n• Plumber Joe: (555) 321-7788',
    category: 'house_rules',
    isPinned: true,
    updatedAt: '2026-09-20T10:00:00.000Z',
    authorName: 'Tariq Khan',
  },
  {
    id: 'note-2',
    familyId: 'fam-khan-90210',
    title: 'Weekly Grocery Needs',
    content: '• Organic 2% Milk (2 gallons)\n• Sourdough bread\n• Honeycrisp apples\n• Eggs & Greek yogurt\n• Green tea & Olive oil',
    category: 'grocery_list',
    isPinned: false,
    updatedAt: '2026-09-28T08:30:00.000Z',
    authorName: 'Ayesha Khan',
  },
];

// INITIAL PERSONAL DATA FOR TARIQ KHAN (Strictly ownerId === 'user-tariq')
export const INITIAL_PERSONAL_EXPENSES: PersonalExpense[] = [
  { id: 'pexp-1', ownerId: 'user-tariq', title: 'Surprise Anniversary Gift Deposit', amount: 185.00, category: 'Personal', date: '2026-09-25' },
  { id: 'pexp-2', ownerId: 'user-tariq', title: 'Professional Cloud Architecture Cert', amount: 300.00, category: 'Work', date: '2026-09-18' },
  { id: 'pexp-3', ownerId: 'user-tariq', title: 'Audiobook Subscription', amount: 14.99, category: 'Subscription', date: '2026-09-10' },
];

export const INITIAL_PERSONAL_TASKS: PersonalTask[] = [
  { id: 'ptask-1', ownerId: 'user-tariq', title: 'Finalize Q4 Cloud migration design review', type: 'work', completed: false, priority: 'high', dueDate: '2026-09-30' },
  { id: 'ptask-2', ownerId: 'user-tariq', title: 'Schedule annual vehicle brake inspection', type: 'personal', completed: true, priority: 'medium', dueDate: '2026-09-22' },
  { id: 'ptask-3', ownerId: 'user-tariq', title: 'Order custom photo frame for Ayesha birthday', type: 'personal', completed: false, priority: 'high', dueDate: '2026-10-05' },
];

export const INITIAL_PERSONAL_NOTES: PersonalNote[] = [
  {
    id: 'pnote-1',
    ownerId: 'user-tariq',
    title: 'Private Journal: Work & Family Reflection',
    content: 'Feeling grateful for the kids settling into their autumn semester. Need to ensure I keep my weekends dedicated to family time and morning walks.',
    category: 'journal',
    updatedAt: '2026-09-27T21:00:00.000Z',
  },
  {
    id: 'pnote-2',
    ownerId: 'user-tariq',
    title: 'Surprise Vacation Ideas for Family',
    content: 'Looking at coastal cabins near Big Sur or Lake Tahoe for late spring. Check availability with flexible cancellation.',
    category: 'private_idea',
    updatedAt: '2026-09-15T14:00:00.000Z',
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    recipientUserId: 'user-tariq',
    familyId: 'fam-khan-90210',
    type: 'new_message',
    title: 'New message from Zayd Khan',
    message: 'Dad, can you please pick up organic milk and sourdough bread?',
    relatedEntityType: 'chat',
    relatedEntityId: 'msg-3',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    readAt: null,
  },
  {
    id: 'notif-2',
    recipientUserId: 'user-tariq',
    familyId: 'fam-khan-90210',
    type: 'bill_due',
    title: 'Upcoming Bill Due Soon',
    message: 'High Speed Fiber Internet ($75.00) is due on Oct 2, 2026.',
    relatedEntityType: 'bill',
    relatedEntityId: 'bill-1',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    readAt: null,
  },
  {
    id: 'notif-3',
    recipientUserId: 'user-tariq',
    familyId: 'fam-khan-90210',
    type: 'medical_update',
    title: 'Dental Reminder Today',
    message: 'Fatima dental checkup today at 4:30 PM at Green Valley Pediatrics.',
    relatedEntityType: 'medical',
    relatedEntityId: 'med-fatima',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    readAt: '2026-09-28T07:30:00.000Z',
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'act-1', actorUserId: 'user-tariq', actorName: 'Tariq Khan', familyId: 'fam-khan-90210', action: 'added a grocery expense ($142.80)', entityType: 'expense', createdAt: '2026-09-26T18:30:00.000Z' },
  { id: 'act-2', actorUserId: 'user-ayesha', actorName: 'Ayesha Khan', familyId: 'fam-khan-90210', action: 'created appointment for Fatima Dental', entityType: 'plan', createdAt: '2026-09-27T09:15:00.000Z' },
  { id: 'act-3', actorUserId: 'user-tariq', actorName: 'Tariq Khan', familyId: 'fam-khan-90210', action: 'pinned emergency contacts to Family Chat', entityType: 'chat', createdAt: '2026-09-26T08:00:00.000Z' },
];
