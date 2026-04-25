use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod dead_mans_switch {
    use super::*;

    /// Creates the switch account for `owner`. Call once at vault setup time.
    pub fn initialize(ctx: Context<Initialize>, deadline_seconds: i64) -> Result<()> {
        let switch = &mut ctx.accounts.switch;
        switch.owner = ctx.accounts.owner.key();
        switch.last_heartbeat = Clock::get()?.unix_timestamp;
        switch.deadline_seconds = deadline_seconds;
        switch.is_dead = false;
        Ok(())
    }

    /// Owner-only. Resets the countdown by updating last_heartbeat to now.
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        let switch = &mut ctx.accounts.switch;
        require!(!switch.is_dead, SwitchError::AlreadyDead);
        switch.last_heartbeat = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Anyone can call. If block_time > last_heartbeat + deadline, marks is_dead = true.
    pub fn check_status(ctx: Context<CheckStatus>) -> Result<()> {
        let switch = &mut ctx.accounts.switch;
        let now = Clock::get()?.unix_timestamp;
        if now > switch.last_heartbeat + switch.deadline_seconds {
            switch.is_dead = true;
        }
        Ok(())
    }
}

// ── Contexts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + SwitchState::INIT_SPACE,
        seeds = [b"switch", owner.key().as_ref()],
        bump
    )]
    pub switch: Account<'info, SwitchState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Ping<'info> {
    #[account(
        mut,
        seeds = [b"switch", owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub switch: Account<'info, SwitchState>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CheckStatus<'info> {
    // Anyone can call — no signer constraint beyond finding the PDA.
    #[account(
        mut,
        seeds = [b"switch", switch.owner.as_ref()],
        bump
    )]
    pub switch: Account<'info, SwitchState>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct SwitchState {
    pub owner: Pubkey,          // 32
    pub last_heartbeat: i64,    // 8  — unix timestamp of last ping
    pub deadline_seconds: i64,  // 8  — inactivity window before switch triggers
    pub is_dead: bool,          // 1  — set by check_status once deadline passes
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum SwitchError {
    #[msg("This switch has already been triggered — the owner is considered dead")]
    AlreadyDead,
}
