export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4 px-4">
      {/* Avatar */}
      <div className="w-8 h-8 bg-[#FFF3E0] rounded-full flex items-center justify-center shrink-0">
        <span className="text-[#FF9933] text-xs font-bold select-none">M</span>
      </div>

      {/* Bubble */}
      <div
        className="bg-[#FFF3E0] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"
        style={{ borderLeft: '3px solid #1A2756' }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-[#FF9933] rounded-full animate-bounce-dot"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
