import { config } from './config';
import app from './app';
import { startStreakReminderScheduler } from './modules/push/streak-reminder';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  startStreakReminderScheduler();
});
