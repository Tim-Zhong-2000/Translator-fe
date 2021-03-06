import {
  CSSProperties,
  forwardRef,
  useCallback,
  useRef,
  useState,
} from "react";

const allowDrag = (e: DragEvent) => e.preventDefault();

const DragableElement = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties; children: any }
>((props, ref) => {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  // const [scale, setScale] = useState(1);
  const lastOffset = useRef({ x: 0, y: 0 }); // 上一次拖动结束时的坐标
  const [isDraging, setIsDraging] = useState(false);
  const temp = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "all";
    temp.current = { x: e.clientX, y: e.clientY };
    setIsDraging(true);
    document.addEventListener("dragover", allowDrag);
  }, []);

  const onDrag = useCallback(
    (e: React.DragEvent) => {
      if (isDraging) {
        const newOffset = getOffset(e);
        requestAnimationFrame(() => {
          setOffsetX(newOffset.x);
          setOffsetY(newOffset.y);
        });
      }
    },
    [isDraging]
  );

  const onDragEnd = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.dropEffect = "move";
      document.removeEventListener("dragover", allowDrag);
      if (isDraging) {
        const newOffset = getOffset(e);
        requestAnimationFrame(() => {
          setOffsetX(newOffset.x);
          setOffsetY(newOffset.y);
        });
        setIsDraging(false);
        lastOffset.current = newOffset;
      }
    },
    [isDraging]
  );

  const getOffset = (e: React.MouseEvent) => {
    const newOffset = {
      x: lastOffset.current.x + e.clientX - temp.current.x,
      y: lastOffset.current.y + e.clientY - temp.current.y,
    };
    return newOffset;
  };

  return (
    <div
      id={String(Math.random())}
      style={{
        ...props.style,
        position: "absolute",
        top: offsetY,
        left: offsetX,
        // transform: `scale(${scale})`,
        cursor: "grab",
      }}
      ref={ref}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
      }}
      draggable={true}
    >
      {props.children}
    </div>
  );
});

export default DragableElement;
