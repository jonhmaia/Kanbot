-- Atmosfera da conta: o fundo escolhido acompanha o usuario entre aparelhos.

alter table public.profiles
  add column if not exists atmosphere text;

alter table public.profiles
  drop constraint if exists profiles_atmosphere_check;

alter table public.profiles
  add constraint profiles_atmosphere_check
  check (
    atmosphere is null or atmosphere in (
      'grafite',
      'ardosia',
      'marinho',
      'vinho',
      'rosa',
      'floresta',
      'ambar',
      'ametista',
      'obsidiana'
    )
  );
