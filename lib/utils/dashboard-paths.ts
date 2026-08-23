export const getDashboardPath = (role: string) => {
  switch (role) {
    case 'admin_school':
    case 'super_admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'parent':
      return '/parent';
    case 'accountant':
      return '/accountant';
    default:
      return '/login';
  }
};
