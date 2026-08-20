import { defineCategory } from './catalog-helpers.js';

export const ELECTRONICS_ITEMS = defineCategory('electronics', [
  ['phone', 'Phone', 'phone', 220, 1, 45000],
  ['smartphone', 'Smartphone', 'phone', 210, 1, 90000],
  ['burner_phone', 'Burner Phone', 'phone', 180, 1, 18000],
  ['radio', 'Handheld Radio', 'radio', 420, 1, 12000],
  ['scanner_radio', 'Scanner Radio', 'radio', 650, 1, 28000, 'restricted', {}, ['scanner radio', 'radio'], 'radio.png'],
  ['laptop', 'Laptop', 'computer', 1800, 1, 120000],
  ['rugged_laptop', 'Rugged Laptop', 'computer', 2800, 1, 185000],
  ['tablet', 'Tablet', 'computer', 650, 1, 75000],
  ['smartwatch', 'Smartwatch', 'wearable', 80, 1, 38000],
  ['gps_unit', 'GPS Unit', 'navigation', 320, 1, 26000],
  ['digital_camera', 'Digital Camera', 'camera', 480, 1, 52000],
  ['body_camera', 'Body Camera', 'camera', 160, 1, 42000],
  ['action_camera', 'Action Camera', 'camera', 140, 1, 36000],
  ['power_bank', 'Power Bank', 'power', 350, 10, 8000],
  ['phone_charger', 'Phone Charger', 'accessory', 180, 10, 3200, 'legal', {}, ['phone charger', 'phone'], 'phone.png'],
  ['usb_cable', 'USB Cable', 'accessory', 80, 10, 1200],
  ['usb_drive', 'USB Drive', 'storage', 30, 10, 2200],
  ['external_drive', 'External Drive', 'storage', 240, 10, 12000],
  ['battery_pack', 'Battery Pack', 'power', 300, 10, 4500],
  ['aa_batteries', 'AA Batteries', 'power', 120, 10, 900],
  ['circuit_board', 'Circuit Board', 'component', 250, 10, 6500],
  ['microcontroller', 'Microcontroller', 'component', 80, 10, 4200],
  ['electronic_kit', 'Electronics Kit', 'component', 1200, 10, 16000],
  ['security_camera', 'Security Camera', 'security', 900, 1, 22000, 'legal', {}, ['security camera', 'camera'], 'camera.png'],
  ['salvaged_electronics', 'Salvaged Electronics', 'salvage', 180, 20, 600]
]);
