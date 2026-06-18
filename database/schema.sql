create type plan_type as enum ('free', 'starter', 'plus');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'free');
create type auth_provider as enum ('email', 'google');
create type application_status as enum ('Saved', 'Applied', 'Interview', 'Rejected', 'Offer');

create table users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  auth_provider auth_provider not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan_type plan_type not null default 'free',
  status subscription_status not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table usage (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  month text not null,
  jd_scans_used integer not null default 0,
  tailored_resumes_used integer not null default 0,
  pdf_downloads_used integer not null default 0,
  ats_checks_used integer not null default 0,
  resume_match_checks_used integer not null default 0,
  salary_estimates_used integer not null default 0,
  public_tool_usage_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table master_resumes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  original_file_url text,
  original_file_name text,
  parsed_text text not null,
  structured_profile_json jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table job_descriptions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  company_name text not null default '',
  job_title text not null default '',
  job_url text not null default '',
  raw_text text not null,
  analysis_json jsonb not null,
  created_at timestamptz not null default now()
);

create table tailored_resumes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  master_resume_id text not null references master_resumes(id) on delete cascade,
  job_description_id text not null references job_descriptions(id) on delete cascade,
  resume_json jsonb not null,
  resume_text text not null,
  original_score integer not null,
  tailored_score integer not null,
  score_breakdown_json jsonb not null,
  keyword_coverage_json jsonb not null,
  change_log_json jsonb not null,
  version_number integer not null,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table applications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  tailored_resume_id text not null references tailored_resumes(id) on delete cascade,
  company_name text not null default '',
  job_title text not null default '',
  job_url text not null default '',
  status application_status not null default 'Saved',
  notes text not null default '',
  date_applied timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public_tool_results (
  id text primary key,
  user_id text references users(id) on delete set null,
  tool_type text not null,
  input_hash text not null,
  input_json jsonb not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create table salary_estimates (
  id text primary key,
  user_id text references users(id) on delete set null,
  role text not null,
  years_experience text not null,
  location text not null,
  skills_json jsonb not null,
  work_mode text not null,
  industry text not null default '',
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create table sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table password_reset_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on subscriptions(user_id);
create index master_resumes_user_active_idx on master_resumes(user_id, active);
create index job_descriptions_user_created_idx on job_descriptions(user_id, created_at desc);
create index tailored_resumes_user_created_idx on tailored_resumes(user_id, created_at desc);
create index applications_user_status_idx on applications(user_id, status);
create index public_tool_results_type_hash_idx on public_tool_results(tool_type, input_hash);
create index sessions_user_expires_idx on sessions(user_id, expires_at);
