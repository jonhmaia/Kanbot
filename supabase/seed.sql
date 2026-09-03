-- Seed demo Kanbot. Rode depois de 0001_init.sql.
-- Login: jason@kanbot.io / Kanbot!demo

create extension if not exists pgcrypto;

do $$
declare
  v_ws uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_pwd text := crypt('Kanbot!demo', gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'jason@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jason Reed"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'sarah@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Lin"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'alex@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Moreau"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'priya@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'diego@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Souza"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'mei@kanbot.io', v_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mei Tanaka"}', now(), now(), '', '', '', '')
  on conflict (id) do update
    set email = excluded.email,
        encrypted_password = excluded.encrypted_password,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'jason@kanbot.io', 'email_verified', true), 'email', '11111111-1111-4111-8111-111111111111', now(), now(), now()),
    (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'sarah@kanbot.io', 'email_verified', true), 'email', '22222222-2222-4222-8222-222222222222', now(), now(), now()),
    (gen_random_uuid(), '33333333-3333-4333-8333-333333333333', jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'alex@kanbot.io', 'email_verified', true), 'email', '33333333-3333-4333-8333-333333333333', now(), now(), now()),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444444', jsonb_build_object('sub', '44444444-4444-4444-8444-444444444444', 'email', 'priya@kanbot.io', 'email_verified', true), 'email', '44444444-4444-4444-8444-444444444444', now(), now(), now()),
    (gen_random_uuid(), '55555555-5555-4555-8555-555555555555', jsonb_build_object('sub', '55555555-5555-4555-8555-555555555555', 'email', 'diego@kanbot.io', 'email_verified', true), 'email', '55555555-5555-4555-8555-555555555555', now(), now(), now()),
    (gen_random_uuid(), '66666666-6666-4666-8666-666666666666', jsonb_build_object('sub', '66666666-6666-4666-8666-666666666666', 'email', 'mei@kanbot.io', 'email_verified', true), 'email', '66666666-6666-4666-8666-666666666666', now(), now(), now())
  on conflict do nothing;
end $$;

insert into public.profiles (id, full_name, email, role_title, color)
values
  ('11111111-1111-4111-8111-111111111111', 'Jason Reed', 'jason@kanbot.io', 'Head of Product', '#F5A524'),
  ('22222222-2222-4222-8222-222222222222', 'Sarah Lin', 'sarah@kanbot.io', 'Product Designer', '#BFE3F2'),
  ('33333333-3333-4333-8333-333333333333', 'Alex Moreau', 'alex@kanbot.io', 'Frontend Engineer', '#8FE3B0'),
  ('44444444-4444-4444-8444-444444444444', 'Priya Nair', 'priya@kanbot.io', 'Backend Engineer', '#C4B5FD'),
  ('55555555-5555-4555-8555-555555555555', 'Diego Souza', 'diego@kanbot.io', 'QA Analyst', '#FDA4AF'),
  ('66666666-6666-4666-8666-666666666666', 'Mei Tanaka', 'mei@kanbot.io', 'Data Analyst', '#7DD3FC')
on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      role_title = excluded.role_title,
      color = excluded.color;

insert into public.workspaces (id, name, slug, plan, created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Downtown Store #21', 'downtown-store-21', 'Business', '11111111-1111-4111-8111-111111111111')
on conflict (id) do update set name = excluded.name, plan = excluded.plan;

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '33333333-3333-4333-8333-333333333333', 'member'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '44444444-4444-4444-8444-444444444444', 'member'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '55555555-5555-4555-8555-555555555555', 'member'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '66666666-6666-4666-8666-666666666666', 'member')
on conflict do nothing;

select public.seed_master_statuses('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

insert into public.projects (id, workspace_id, name, key, description, color, icon, status, owner_id, start_date, due_date, created_at)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Storefront Redesign', 'SFR', 'Nova vitrine digital e checkout unificado da loja.', '#F5A524', 'sparkle', 'active', '11111111-1111-4111-8111-111111111111', '2026-07-14', '2026-09-30', '2026-07-14T09:00:00Z'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Staffing Intelligence', 'STI', 'Previsao de footfall e alocacao automatica de turnos.', '#BFE3F2', 'pulse', 'active', '66666666-6666-4666-8666-666666666666', '2026-06-02', '2026-10-15', '2026-06-02T09:00:00Z'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Mobile Companion App', 'MCA', 'App de bolso para gerentes acompanharem a operacao.', '#8FE3B0', 'device', 'active', '33333333-3333-4333-8333-333333333333', '2026-08-01', '2026-11-20', '2026-08-01T09:00:00Z'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Compliance 2026', 'CMP', 'Auditoria de jornada, pausas e documentacao legal.', '#C4B5FD', 'shield', 'on_hold', '44444444-4444-4444-8444-444444444444', '2026-05-10', '2026-12-01', '2026-05-10T09:00:00Z')
on conflict (id) do nothing;

insert into public.board_columns (id, project_id, master_status_id, name, color, wip_limit, position)
select v.id, v.project_id, ms.id, v.name, v.color, v.wip_limit, v.position
from (values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc01'::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid, 'backlog', 'Ideas', '#6E7A85', null::int, 0),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'in_progress', 'Designing', '#F5A524', 4, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc03', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'review', 'Client Review', '#BFE3F2', 3, 2),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc04', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'done', 'Shipped', '#8FE3B0', null, 3),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc05', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'backlog', 'Discovery', '#6E7A85', null, 0),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc06', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'in_progress', 'Modeling', '#F5A524', 3, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc07', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'review', 'Validation', '#BFE3F2', 2, 2),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc08', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'blocked', 'Blocked', '#E5484D', null, 3),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc09', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'done', 'Live', '#8FE3B0', null, 4),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc10', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'backlog', 'Backlog', '#6E7A85', null, 0),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc11', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'in_progress', 'Building', '#F5A524', 5, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc12', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'review', 'Code Review', '#BFE3F2', 3, 2),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc13', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'done', 'Released', '#8FE3B0', null, 3),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc14', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'backlog', 'Mapped', '#6E7A85', null, 0),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc15', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'in_progress', 'Auditing', '#F5A524', 2, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc16', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'review', 'Legal Sign-off', '#BFE3F2', 2, 2),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc17', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'done', 'Archived', '#8FE3B0', null, 3)
) as v(id, project_id, status_key, name, color, wip_limit, position)
join public.master_statuses ms
  on ms.workspace_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and ms.key = v.status_key
on conflict (id) do nothing;

insert into public.labels (workspace_id, name, color)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'research', '#6E7A85'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'design-system', '#C4B5FD'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ui', '#BFE3F2'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'checkout', '#F5A524'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'a11y', '#8FE3B0'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'review', '#EDEDED'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'infra', '#7DD3FC'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'data', '#7DD3FC'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'discovery', '#6E7A85'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ml', '#C4B5FD'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'blocker', '#E5484D'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'spec', '#F5A524'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'arch', '#8FE3B0'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'auth', '#FDA4AF'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'legal', '#C4B5FD'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'audit', '#E5484D')
on conflict (workspace_id, name) do nothing;

insert into public.tasks (id, project_id, column_id, title, priority, assignee_id, reporter_id, due_date, estimate_hours, logged_hours, progress, position, created_at, updated_at)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01', 'Mapear jornada de checkout atual', 'medium', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '2026-09-08', 6, 0, 0, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01', 'Benchmark de 5 concorrentes diretos', 'low', '66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', '2026-09-12', 5, 0, 0, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01', 'Definir tokens de cor da nova marca', 'medium', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', null, 4, 0, 0, 2, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'Hero da home com previsao de estoque', 'high', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '2026-09-05', 10, 6, 60, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'Fluxo de pagamento em 2 passos', 'urgent', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '2026-09-03', 12, 9, 75, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd06', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'Estados vazios e de erro', 'medium', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', null, 5, 1, 20, 2, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd07', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc03', 'Revisao de acessibilidade AA', 'high', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', '2026-09-04', 6, 5, 85, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd08', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc03', 'Aprovacao visual com stakeholders', 'medium', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', null, 3, 0, 50, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd09', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc04', 'Nova grid de categorias', 'medium', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', null, 8, 8, 100, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd10', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-cccccccccc04', 'Migracao dos assets para CDN', 'low', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', null, 4, 4, 100, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd11', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc05', 'Coletar historico de footfall 24 meses', 'medium', '66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', null, 8, 0, 0, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd12', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc05', 'Definir metricas de cobertura', 'high', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '2026-09-10', 4, 0, 0, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd13', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc06', 'Modelo de previsao de pico 17-19h', 'urgent', '66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', '2026-09-06', 16, 11, 70, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd14', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc06', 'Pipeline de ingestao horaria', 'high', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', null, 12, 5, 40, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd15', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc07', 'Backtest do modelo contra Q2', 'high', '66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', '2026-09-07', 7, 6, 80, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd16', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc08', 'Acesso ao ERP de turnos negado', 'urgent', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', '2026-09-02', 2, 0, 10, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd17', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc09', 'Dashboard de variancia de cobertura', 'medium', '66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', null, 9, 9, 100, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd18', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-cccccccccc09', 'Alertas de overtime por e-mail', 'low', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', null, 5, 5, 100, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd19', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc10', 'Especificar push de escala do dia', 'medium', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', null, 4, 0, 0, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd20', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc10', 'Escolher stack de build mobile', 'high', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '2026-09-09', 6, 0, 0, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd21', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc10', 'Design do onboarding em 3 telas', 'low', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', null, 7, 0, 0, 2, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc11', 'Autenticacao com magic link', 'high', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', '2026-09-05', 10, 7, 65, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd23', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc11', 'Tela de tarefas ao vivo', 'urgent', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '2026-09-11', 14, 4, 30, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd24', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc11', 'Sincronizacao offline-first', 'high', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', null, 18, 3, 15, 2, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd25', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc12', 'PR: componente de timeline', 'medium', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', null, 3, 2, 70, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd26', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-cccccccccc13', 'Setup do CI mobile', 'medium', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', null, 6, 6, 100, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd27', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-cccccccccc14', 'Levantar exigencias de pausa por regiao', 'medium', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', null, 8, 0, 0, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd28', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-cccccccccc14', 'Checklist de documentos obrigatorios', 'low', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', null, 4, 0, 0, 1, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd29', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-cccccccccc15', 'Auditoria de jornada agosto', 'high', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', '2026-09-15', 12, 8, 55, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd30', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-cccccccccc16', 'Parecer juridico sobre banco de horas', 'urgent', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '2026-09-04', 5, 3, 60, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd31', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-cccccccccc17', 'Politica de pausas publicada', 'medium', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', null, 4, 4, 100, 0, '2026-08-20T10:00:00Z', '2026-09-01T10:00:00Z')
on conflict (id) do nothing;

insert into public.task_labels (task_id, label_id)
select t.task_id, l.id
from (values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01'::uuid, 'research'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'research'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'design-system'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'checkout'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd06', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd07', 'a11y'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd08', 'review'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd09', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd10', 'infra'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd11', 'data'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd12', 'discovery'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd13', 'ml'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd14', 'data'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd14', 'infra'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd15', 'ml'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd16', 'blocker'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd17', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd17', 'data'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd18', 'infra'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd19', 'spec'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd20', 'arch'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd21', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', 'auth'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd23', 'ui'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd24', 'arch'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd25', 'review'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd26', 'infra'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd27', 'legal'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd28', 'legal'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd29', 'audit'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd30', 'legal'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd31', 'legal')
) as t(task_id, label_name)
join public.labels l on l.workspace_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and l.name = t.label_name
on conflict do nothing;

insert into public.checklist_items (task_id, text, done, position)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'Wireframe', true, 0),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'Alta fidelidade', true, 1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'Handoff', false, 2);

insert into public.ai_insights (id, workspace_id, kind, title, detail, payload)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'balance', 'Mover 2 tarefas de Alex para Priya', 'Building esta 140% acima do WIP limit nesta semana.', '{"taskIds":["dddddddd-dddd-4ddd-8ddd-dddddddddd24"],"toMemberId":"44444444-4444-4444-8444-444444444444"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'risk', 'Priorizar "Acesso ao ERP de turnos"', 'Bloqueio ativo ha 6 dias travando 3 tarefas dependentes.', '{"taskIds":["dddddddd-dddd-4ddd-8ddd-dddddddddd16"],"priority":"urgent"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'schedule', 'Antecipar review do checkout em 1 dia', 'Client Review fica ocioso na quinta-feira segundo o historico.', '{"taskIds":["dddddddd-dddd-4ddd-8ddd-dddddddddd05"],"toStatus":"review"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'cleanup', 'Arquivar 4 cards parados no Backlog', 'Sem atualizacao ha mais de 45 dias no Compliance 2026.', '{"projectId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4"}')
on conflict (id) do nothing;

insert into public.activity_log (workspace_id, project_id, actor_id, action, payload, created_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'moved', '{"target":"Hero da home"}', '2026-09-02T08:12:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '44444444-4444-4444-8444-444444444444', 'commented', '{"target":"Acesso ao ERP"}', '2026-09-02T07:48:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '33333333-3333-4333-8333-333333333333', 'completed', '{"target":"Setup do CI mobile"}', '2026-09-01T18:30:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '55555555-5555-4555-8555-555555555555', 'created', '{"target":"Auditoria de jornada"}', '2026-09-01T16:05:00Z');
