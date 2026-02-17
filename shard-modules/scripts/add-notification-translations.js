/**
 * Script to add notification channel translations to lang.json
 */

const fs = require('fs');
const path = require('path');

// Read the existing lang.json
const langPath = path.join(__dirname, '..', 'config', 'lang.json');
const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

// Minimal translations for notification channels
const newTranslations = {
  "Level Up, Greet, Birthday, Daily Reward… Channel": {
    "ru": "Канал повышения уровня, приветствия, дня рождения, ежедневной награды…",
    "en-US": "Level Up, Greet, Birthday, Daily Reward… Channel",
    "uk": "Канал підвищення рівня, вітання, дня народження, щоденної нагороди…",
    "es-ES": "Canal de subida de nivel, bienvenida, cumpleaños, recompensa diaria…"
  },
  "Setup Level Up Channel": {
    "ru": "Настроить канал повышения уровня",
    "en-US": "Setup Level Up Channel",
    "uk": "Налаштувати канал підвищення рівня",
    "es-ES": "Configurar canal de subida de nivel"
  },
  "Setup Birthday Channel": {
    "ru": "Настроить канал дня рождения",
    "en-US": "Setup Birthday Channel",
    "uk": "Налаштувати канал дня народження",
    "es-ES": "Configurar canal de cumpleaños"
  },
  "Setup Welcome Channel": {
    "ru": "Настроить канал приветствия",
    "en-US": "Setup Welcome Channel",
    "uk": "Налаштувати канал вітання",
    "es-ES": "Configurar canal de bienvenida"
  },
  "Setup Goodbye Channel": {
    "ru": "Настроить канал прощания",
    "en-US": "Setup Goodbye Channel",
    "uk": "Налаштувати канал прощання",
    "es-ES": "Configurar canal de despedida"
  },
  "Setup Daily Reward Channel": {
    "ru": "Настроить канал ежедневной награды",
    "en-US": "Setup Daily Reward Channel",
    "uk": "Налаштувати канал щоденної нагороди",
    "es-ES": "Configurar canal de recompensa diaria"
  },
  "Enable": {
    "ru": "Включить",
    "en-US": "Enable",
    "uk": "Увімкнути",
    "es-ES": "Habilitar"
  },
  "Disable": {
    "ru": "Отключить",
    "en-US": "Disable",
    "uk": "Вимкнути",
    "es-ES": "Deshabilitar"
  },
  "Static Thumbnail": {
    "ru": "Статичная миниатюра",
    "en-US": "Static Thumbnail",
    "uk": "Статична мініатюра",
    "es-ES": "Miniatura estática"
  },
  "User-Specific Thumbnail": {
    "ru": "Миниатюра пользователя",
    "en-US": "User-Specific Thumbnail",
    "uk": "Мініатюра користувача",
    "es-ES": "Miniatura específica del usuario"
  },
  "Create Daily Reward Channel": {
    "ru": "Создать канал ежедневной награды",
    "en-US": "Create Daily Reward Channel",
    "uk": "Створити канал щоденної нагороди",
    "es-ES": "Crear canal de recompensa diaria"
  },
  "Claim Reward": {
    "ru": "Получить награду",
    "en-US": "Claim Reward",
    "uk": "Отримати нагороду",
    "es-ES": "Reclamar recompensa"
  },
  "Claimed on": {
    "ru": "Получено",
    "en-US": "Claimed on",
    "uk": "Отримано",
    "es-ES": "Reclamado el"
  },
  "Please select a channel for notifications": {
    "ru": "Пожалуйста, выберите канал для уведомлений",
    "en-US": "Please select a channel for notifications",
    "uk": "Будь ласка, виберіть канал для сповіщень",
    "es-ES": "Por favor, selecciona un canal para notificaciones"
  },
  "Please provide a Discord message link": {
    "ru": "Пожалуйста, укажите ссылку на сообщение Discord",
    "en-US": "Please provide a Discord message link",
    "uk": "Будь ласка, вкажіть посилання на повідомлення Discord",
    "es-ES": "Por favor, proporciona un enlace de mensaje de Discord"
  },
  "Choose thumbnail type for custom message": {
    "ru": "Выберите тип миниатюры для пользовательского сообщения",
    "en-US": "Choose thumbnail type for custom message",
    "uk": "Виберіть тип мініатюри для користувацького повідомлення",
    "es-ES": "Elige el tipo de miniatura para el mensaje personalizado"
  },
  "Channel configured successfully": {
    "ru": "Канал успешно настроен",
    "en-US": "Channel configured successfully",
    "uk": "Канал успішно налаштовано",
    "es-ES": "Canal configurado exitosamente"
  },
  "Channel disabled successfully": {
    "ru": "Канал успешно отключен",
    "en-US": "Channel disabled successfully",
    "uk": "Канал успішно вимкнено",
    "es-ES": "Canal deshabilitado exitosamente"
  },
  "Daily reward channel created successfully": {
    "ru": "Канал ежедневной награды успешно создан",
    "en-US": "Daily reward channel created successfully",
    "uk": "Канал щоденної нагороди успішно створено",
    "es-ES": "Canal de recompensa diaria creado exitosamente"
  },
  "Cannot access this channel. Please ensure the bot has permission to send messages.": {
    "ru": "Не удается получить доступ к этому каналу. Убедитесь, что у бота есть разрешение на отправку сообщений.",
    "en-US": "Cannot access this channel. Please ensure the bot has permission to send messages.",
    "uk": "Не вдається отримати доступ до цього каналу. Переконайтеся, що у бота є дозвіл на надсилання повідомлень.",
    "es-ES": "No se puede acceder a este canal. Asegúrate de que el bot tenga permiso para enviar mensajes."
  },
  "Invalid message link format. Please provide a valid Discord message URL.": {
    "ru": "Неверный формат ссылки на сообщение. Пожалуйста, укажите действительный URL сообщения Discord.",
    "en-US": "Invalid message link format. Please provide a valid Discord message URL.",
    "uk": "Невірний формат посилання на повідомлення. Будь ласка, вкажіть дійсний URL повідомлення Discord.",
    "es-ES": "Formato de enlace de mensaje inválido. Por favor, proporciona una URL de mensaje de Discord válida."
  },
  "Cannot access this message. Please ensure the message exists and the bot has permission to view it.": {
    "ru": "Не удается получить доступ к этому сообщению. Убедитесь, что сообщение существует и у бота есть разрешение на его просмотр.",
    "en-US": "Cannot access this message. Please ensure the message exists and the bot has permission to view it.",
    "uk": "Не вдається отримати доступ до цього повідомлення. Переконайтеся, що повідомлення існує і у бота є дозвіл на його перегляд.",
    "es-ES": "No se puede acceder a este mensaje. Asegúrate de que el mensaje existe y el bot tiene permiso para verlo."
  },
  "Custom Message Configuration": {
    "ru": "Настройка пользовательского сообщения",
    "en-US": "Custom Message Configuration",
    "uk": "Налаштування користувацького повідомлення",
    "es-ES": "Configuración de mensaje personalizado"
  },
  "Discord Message Link": {
    "ru": "Ссылка на сообщение Discord",
    "en-US": "Discord Message Link",
    "uk": "Посилання на повідомлення Discord",
    "es-ES": "Enlace de mensaje de Discord"
  }
};

// Add new translations (only if they don't exist)
let addedCount = 0;
for (const [key, translations] of Object.entries(newTranslations)) {
  if (!langData.translations[key]) {
    langData.translations[key] = translations;
    addedCount++;
  }
}

// Write back to file
fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');

console.log(`✓ Added ${addedCount} new translation keys to lang.json`);
console.log(`✓ Total translation keys: ${Object.keys(langData.translations).length}`);
