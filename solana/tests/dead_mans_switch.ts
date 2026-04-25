import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DeadMansSwitch } from "../target/types/dead_mans_switch";
import { assert } from "chai";

describe("dead-mans-switch", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DeadMansSwitch as Program<DeadMansSwitch>;
  const owner = provider.wallet as anchor.Wallet;

  let switchPda: anchor.web3.PublicKey;
  let bump: number;

  before(async () => {
    [switchPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("switch"), owner.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initialize creates the switch account", async () => {
    //const DEADLINE = new anchor.BN(30 * 24 * 60 * 60); // 30 days
    const DEADLINE = new anchor.BN(30); // 30 seconds
    await program.methods
      .initialize(DEADLINE)
      .accounts({ switch: switchPda, owner: owner.publicKey })
      .rpc();

    const state = await program.account.switchState.fetch(switchPda);
    assert.equal(state.owner.toBase58(), owner.publicKey.toBase58());
    assert.equal(state.isDead, false);
    assert.ok(state.lastHeartbeat.gtn(0));
  });

  it("ping updates last_heartbeat", async () => {
    const before = (await program.account.switchState.fetch(switchPda)).lastHeartbeat;
    await new Promise((r) => setTimeout(r, 1100)); // wait 1s for clock to advance
    await program.methods
      .ping()
      .accounts({ switch: switchPda, owner: owner.publicKey })
      .rpc();
    const after = (await program.account.switchState.fetch(switchPda)).lastHeartbeat;
    assert.ok(after.gte(before));
  });

  it("check_status does not trigger when within deadline", async () => {
    await program.methods.checkStatus().accounts({ switch: switchPda }).rpc();
    const state = await program.account.switchState.fetch(switchPda);
    assert.equal(state.isDead, false);
  });

  it("non-owner cannot ping", async () => {
    const stranger = anchor.web3.Keypair.generate();
    try {
      await program.methods
        .ping()
        .accounts({ switch: switchPda, owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.include(err.message, "has_one");
    }
  });
});
