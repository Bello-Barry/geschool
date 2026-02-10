export function getDashboardPath(role: string): string {
  switch (role) {
    case 'super_admin':
    case 'admin_school':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'parent':
      return '/parent';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
}
