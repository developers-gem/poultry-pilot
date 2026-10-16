/// Where a notification takes the person in the app (by its category, or what it links to).
String routeForNotification({String? category, String? entity}) {
  switch (entity) {
    case 'task':
      return '/tasks';
  }
  switch (category) {
    case 'task_due':
      return '/tasks';
    case 'vaccination_due':
      return '/health';
    case 'mortality':
    case 'feed':
    case 'water':
    case 'egg_production':
    case 'weight_variance':
      return '/production';
    case 'order_update':
    case 'payment_update':
      return '/more/notifications';
    default:
      return '/home';
  }
}
