export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItemsByRole: Record<string, NavItem[]> = {
  admin_school: [
    { label: "Tableau de bord", href: "/admin", icon: "LayoutDashboard" },
    { label: "Élèves", href: "/admin/students", icon: "GraduationCap" },
    { label: "Enseignants", href: "/admin/teachers", icon: "Users" },
    { label: "Parents", href: "/admin/parents", icon: "UserCog" },
    { label: "Classes", href: "/admin/classes", icon: "School" },
    { label: "Matières", href: "/admin/subjects", icon: "BookOpen" },
    { label: "Affectations", href: "/admin/assignments", icon: "Link" },
    { label: "Présences", href: "/admin/attendance", icon: "Calendar" },
    { label: "Années scolaires", href: "/admin/academic-years", icon: "CalendarRange" },
    { label: "Paiements", href: "/admin/payments", icon: "CreditCard" },
    { label: "Bulletins", href: "/admin/reports", icon: "FileText" },
    { label: "Paramètres", href: "/admin/school", icon: "Settings" },
  ],
  super_admin: [
    { label: "Tableau de bord", href: "/admin", icon: "LayoutDashboard" },
    { label: "Élèves", href: "/admin/students", icon: "GraduationCap" },
    { label: "Enseignants", href: "/admin/teachers", icon: "Users" },
    { label: "Parents", href: "/admin/parents", icon: "UserCog" },
    { label: "Classes", href: "/admin/classes", icon: "School" },
    { label: "Matières", href: "/admin/subjects", icon: "BookOpen" },
    { label: "Affectations", href: "/admin/assignments", icon: "Link" },
    { label: "Présences", href: "/admin/attendance", icon: "Calendar" },
    { label: "Emploi du temps", href: "/admin/schedule", icon: "CalendarRange" },
    { label: "Années scolaires", href: "/admin/academic-years", icon: "CalendarRange" },
    { label: "Paiements", href: "/admin/payments", icon: "CreditCard" },
    { label: "Bulletins", href: "/admin/reports", icon: "FileText" },
    { label: "Paramètres", href: "/admin/school", icon: "Settings" },
  ],
  teacher: [
    { label: "Tableau de bord", href: "/teacher", icon: "LayoutDashboard" },
    { label: "Notes", href: "/teacher/grades", icon: "ClipboardList" },
    { label: "Présences", href: "/teacher/attendance", icon: "Calendar" },
    { label: "Mes classes", href: "/teacher/classes", icon: "School" },
    { label: "Emploi du temps", href: "/teacher/schedule", icon: "CalendarRange" },
    { label: "Messages", href: "/teacher/messages", icon: "MessageSquare" },
  ],
  parent: [
    { label: "Tableau de bord", href: "/parent", icon: "LayoutDashboard" },
    { label: "Mes enfants", href: "/parent/children", icon: "Users" },
    { label: "Paiements", href: "/parent/payments", icon: "CreditCard" },
    { label: "Messages", href: "/parent/messages", icon: "MessageSquare" },
    { label: "Assistant IA", href: "/parent/chatbot", icon: "Bot" },
    { label: "Emploi du temps", href: "/parent/schedule", icon: "CalendarRange" },
  ],
  student: [
    { label: "Tableau de bord", href: "/student", icon: "LayoutDashboard" },
    { label: "Mes notes", href: "/student/grades", icon: "ClipboardList" },
    { label: "Emploi du temps", href: "/student/schedule", icon: "CalendarRange" },
  ],
};
