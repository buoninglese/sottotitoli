-- Clean up old "0 minuti" notifications that were created before the trigger fix
DELETE FROM notifications
WHERE type = 'system'
  AND title = 'Sessione salvata'
  AND message LIKE '%0 minuti%';
