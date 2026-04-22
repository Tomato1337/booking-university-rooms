export default function Logo() {
  return (
    // <div className='text-primary text-4xl font-black uppercase tracking-tighter'>UNI</div>
    <div className="flex gap-2 items-center">
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-13.5"
      >
        <polygon
          points="60,30 100,30 130,60 130,100 100,130 60,130 30,100 30,60"
          stroke-width="12"
          className="stroke-on-surface"
          fill="none"
        />
      </svg>
      <div className="text-primary text-4xl font-black uppercase tracking-tighter">SPACE</div>
    </div>
  );
}
