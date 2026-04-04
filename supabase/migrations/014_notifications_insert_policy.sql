-- Разрешаем аутентифицированным пользователям создавать уведомления через API

create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');


