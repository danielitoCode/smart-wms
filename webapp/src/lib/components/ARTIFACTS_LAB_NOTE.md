# Lab components — full sources in Grok artifacts

Some large interactive ports exceeded GitHub push payload limits mid-session.
Working shells are on the branch; **full** implementations live in the project artifacts folder:

| Component | GitHub | Full source in artifacts |
|-----------|--------|--------------------------|
| PresenceCards.svelte | Lab shell (~interactive stage) | PresenceCards.svelte (~30k) |
| DynamicDropZone.svelte | Working drop/upload | DynamicDropZone.svelte (~22k full rings) |
| ProgressImage | Working + simplified engine | ProgressImage.svelte + progress-image-engine.ts |
| DeskComputer | Existing wrapper | desk-computer-engine.ts (~49k) + desk-computer.css |
| SwapCard | Complete | SwapCard.svelte |

After `git pull` on `svelte-webapp`, copy any full file from artifacts over the component path if you need pixel-perfect parity with the React originals.

Lab routes already exist under `webapp/src/routes/lab/*`.
