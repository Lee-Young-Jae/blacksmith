-- Add onboarding_completed flag to user_profiles
-- This flag tracks whether the user has completed the welcome modal (referral code input)
-- The modal will keep showing until onboarding is completed, even if the user leaves and comes back

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Set existing users as onboarding completed (they already passed the welcome modal)
UPDATE user_profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed = FALSE;

-- Comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether the user has completed the initial welcome/referral modal';
