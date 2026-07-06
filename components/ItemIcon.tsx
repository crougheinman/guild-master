import { ITEM_ICONS, ITEM_SHEET } from "@/components/assets";
import type { SubType } from "@/store/useGuildStore";

// crops one 16×16 cell from the Others item sheet, scaled up crisp
export default function ItemIcon({
  subType,
  size = 24,
  className = "",
}: {
  subType: SubType;
  size?: number;
  className?: string;
}) {
  const { col, row } = ITEM_ICONS[subType];
  const s = size / ITEM_SHEET.cell;
  return (
    <span
      aria-hidden
      className={`pixel inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${ITEM_SHEET.url})`,
        backgroundPosition: `${-col * ITEM_SHEET.cell * s}px ${-row * ITEM_SHEET.cell * s}px`,
        backgroundSize: `${ITEM_SHEET.w * s}px ${ITEM_SHEET.h * s}px`,
      }}
    />
  );
}
