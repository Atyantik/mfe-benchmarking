export default function Widget({ label }: { label: string }) {
  return (
    <div data-testid="remote-widget">
      <h2>Remote widget: {label}</h2>
      <p>Rendered by spike_remote.</p>
    </div>
  );
}
