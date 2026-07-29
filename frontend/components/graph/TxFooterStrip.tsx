export function TxFooterStrip({
  settlementTx,
  block,
  contract,
  consensus,
}: {
  settlementTx: string;
  block: string;
  contract: string;
  consensus: string;
}) {
  const rows: [string, string][] = [
    ["Settlement TX", settlementTx],
    ["Block", block],
    ["Contract", contract],
    ["Consensus", consensus],
  ];

  return (
    <div className="rounded-xl border border-wist/[.06] bg-prus/50 px-5 py-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 mb-1.5 last:mb-0">
          <span className="font-mono text-[.55rem] text-t3 shrink-0">{k}</span>
          <span className="font-mono text-[.6rem] text-t2 text-right break-all">{v}</span>
        </div>
      ))}
    </div>
  );
}
