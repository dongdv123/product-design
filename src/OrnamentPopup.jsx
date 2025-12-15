import { useMemo, useState, useRef, useEffect } from "react";
import "./ornament.css";

const charmList = [
  { value: "ball", label: "Ball", img: "https://m.media-amazon.com/images/S/gestalt-seller-images-prod-us-east-1/ATVPDKIKX0DER/A1PCU8P64JFCQ2/41f0c3cb-4cd0-45f3-8329-e3690a3884b7._SS120_FMpng_.png" },
  { value: "paw", label: "Paw", img: "https://m.media-amazon.com/images/S/gestalt-seller-images-prod-us-east-1/ATVPDKIKX0DER/A1PCU8P64JFCQ2/677b17f4-d611-4191-854a-c254833d2da2._SS120_FMpng_.png" },
  { value: "cat", label: "Cat", img: "https://m.media-amazon.com/images/S/gestalt-seller-images-prod-us-east-1/ATVPDKIKX0DER/A1PCU8P64JFCQ2/d05a0c3c-c2fd-4777-bbf5-751259ffc628._SS120_FMpng_.png" },
];


export default function OrnamentPopup() {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("demo");
  const [dropped, setDropped] = useState([]);
  const [draggedCharm, setDraggedCharm] = useState(null); // charm đang được drag trong canvas
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCharm, setSelectedCharm] = useState(null); // charm được chọn để resize/rotate
  const [isResizing, setIsResizing] = useState(false); // đang resize/rotate
  const [resizeHandle, setResizeHandle] = useState(null); // handle nào đang được drag
  const [resizeStart, setResizeStart] = useState(null); // vị trí bắt đầu resize
  const maxLen = 25;
  const canvasRef = useRef(null);

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [useImageBackground, setUseImageBackground] = useState(false);
  const [charmImages, setCharmImages] = useState({}); // {charmType: Image}
  const [defaultImages, setDefaultImages] = useState({}); // {charmType: Image} for loaded default images

  // Load default charm images on mount
  useEffect(() => {
    const loadImages = async () => {
      const loadedParams = {};
      const promises = charmList.map(charm => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            loadedParams[charm.value] = img;
            resolve();
          };
          img.onerror = () => resolve(); // Ignore errors
          img.crossOrigin = "anonymous";
          img.src = charm.img;
        });
      });

      await Promise.all(promises);
      setDefaultImages(loadedParams);
    };

    loadImages();
  }, []);

  // Drop zone states - vùng rơi hợp lệ
  const [dropZone, setDropZone] = useState([]); // Array of {x, y} points (percentage)
  const [isDrawingZone, setIsDrawingZone] = useState(false); // Drawing mode active
  const [tempZonePoints, setTempZonePoints] = useState([]); // Points while drawing


  const remaining = useMemo(() => maxLen - title.length, [title]);

  // Canvas drawing functions
  const drawOrnament = (ctx, width, height) => {
    if (useImageBackground && backgroundImage) {
      // Draw uploaded background image, scaled to fit canvas
      const scale = Math.min(width / backgroundImage.width, height / backgroundImage.height);
      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;

      ctx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
    } else {
      // Draw ornament background (simple circle for now)
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 20, 0, 2 * Math.PI);
      ctx.fill();

      // Add ornament cap
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.arc(width / 2, height / 4, 30, 0, 2 * Math.PI);
      ctx.fill();

      // Add ornament hook
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 8, 15, Math.PI, 0);
      ctx.stroke();
    }
  };

  const drawTitle = (ctx, title, width, height) => {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, height - 40);
  };

  const drawCharm = (ctx, charm, x, y, baseSize = 40) => {
    // Find charm image
    const charmData = charmList.find(c => c.value === charm.type);
    if (!charmData) return;

    // Apply scale and rotation
    const scale = charm.scale || 1;
    const rotation = charm.rotation || 0;
    const size = baseSize * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);

    // Prioritize uploaded image, then default image, then colored circle fallback
    const imageToDraw = charmImages[charm.type] || defaultImages[charm.type];

    if (imageToDraw) {
      ctx.drawImage(imageToDraw, -size / 2, -size / 2, size, size);
    } else {
      // Fallback: Colored circles
      const colors = {
        ball: '#ffd93d',
        paw: '#a8e6cf',
        cat: '#ffb3ba'
      };

      ctx.fillStyle = colors[charm.type] || '#ccc';
      ctx.beginPath();
      // Draw circle filling the canvas with some padding
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Add charm label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(charmData.label, 0, size / 2 + 15);
    }
    ctx.restore();
  };

  // Draw selection handles around selected charm
  const drawSelectionHandles = (ctx, charm, canvasWidth, canvasHeight) => {
    const x = (charm.x / 100) * canvasWidth;
    const y = (charm.y / 100) * canvasHeight;
    const scale = charm.scale || 1;
    const size = 40 * scale;
    const handleSize = 8;
    const padding = 5;
    const boxSize = size + padding * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((charm.rotation || 0) * Math.PI) / 180);

    // Draw selection box
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    ctx.setLineDash([]);

    // Corner handles - for rotation
    const corners = [
      { name: 'nw', x: -boxSize / 2, y: -boxSize / 2 },
      { name: 'ne', x: boxSize / 2, y: -boxSize / 2 },
      { name: 'se', x: boxSize / 2, y: boxSize / 2 },
      { name: 'sw', x: -boxSize / 2, y: boxSize / 2 },
    ];

    // Edge handles - for scaling
    const edges = [
      { name: 'n', x: 0, y: -boxSize / 2 },
      { name: 'e', x: boxSize / 2, y: 0 },
      { name: 's', x: 0, y: boxSize / 2 },
      { name: 'w', x: -boxSize / 2, y: 0 },
    ];

    // Draw corner rotation handles (circles)
    ctx.fillStyle = '#ff6b6b';
    corners.forEach(corner => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw edge scale handles (squares)
    ctx.fillStyle = '#0066cc';
    edges.forEach(edge => {
      ctx.fillRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
    });

    // Draw delete button at top
    const deleteY = -boxSize / 2 - 18;
    const deleteSize = 14;

    // Red circle background
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(0, deleteY, deleteSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // X icon
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, deleteY - 3);
    ctx.lineTo(3, deleteY + 3);
    ctx.moveTo(3, deleteY - 3);
    ctx.lineTo(-3, deleteY + 3);
    ctx.stroke();

    ctx.restore();
  };

  // Check if point is inside polygon using ray-casting algorithm
  const isPointInPolygon = (x, y, polygon) => {
    if (!polygon || polygon.length < 3) return true; // No zone = allow everywhere

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Get valid drop position inside polygon
  const getValidDropPosition = () => {
    if (dropZone.length < 3) {
      // No zone defined, use random position
      return {
        x: Math.random() * 70 + 15,
        y: Math.random() * 60 + 20
      };
    }

    // Try to find a valid position inside polygon
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.random() * 80 + 10;
      const y = Math.random() * 80 + 10;
      if (isPointInPolygon(x, y, dropZone)) {
        return { x, y };
      }
      attempts++;
    }

    // Fallback: center of polygon
    const centerX = dropZone.reduce((sum, p) => sum + p.x, 0) / dropZone.length;
    const centerY = dropZone.reduce((sum, p) => sum + p.y, 0) / dropZone.length;
    return { x: centerX, y: centerY };
  };

  // Draw drop zone polygon on canvas
  const drawDropZone = (ctx, points, width, height, isTemp = false) => {
    if (points.length < 2) return;

    ctx.save();
    ctx.beginPath();

    const firstPoint = points[0];
    ctx.moveTo((firstPoint.x / 100) * width, (firstPoint.y / 100) * height);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i].x / 100) * width, (points[i].y / 100) * height);
    }

    if (!isTemp && points.length >= 3) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      ctx.fill();
    }

    ctx.strokeStyle = isTemp ? '#4CAF50' : 'rgba(76, 175, 80, 0.8)';
    ctx.lineWidth = isTemp ? 2 : 3;
    ctx.setLineDash(isTemp ? [5, 5] : []);
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc((point.x / 100) * width, (point.y / 100) * height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = index === 0 ? '#ff5722' : '#4CAF50';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  };

  // Image handling functions
  const handleBackgroundImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          setUseImageBackground(true);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCharmImageUpload = (charmType, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setCharmImages(prev => ({
            ...prev,
            [charmType]: img
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw on canvas whenever title, dropped charms, background image, or charm images change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw ornament
    drawOrnament(ctx, width, height);

    // Draw title
    drawTitle(ctx, title, width, height);

    // Draw dropped charms với falling animation
    dropped.forEach(charm => {
      let x = (charm.x / 100) * width;
      let y = (charm.y / 100) * height;
      let isAnimating = false;

      // Kiểm tra nếu charm đang falling
      if (charm.isFalling && charm.fallStartTime) {
        const elapsed = Date.now() - charm.fallStartTime;
        const duration = 700; // 700ms để có chỗ bounce
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
          isAnimating = true;

          // Bounce easing - rơi xuống và nảy lên
          let easeProgress;
          if (progress < 0.6) {
            // Giai đoạn rơi xuống (60% đầu) - gravity
            const fallProgress = progress / 0.6;
            easeProgress = fallProgress * fallProgress;
          } else {
            // Giai đoạn bounce (40% cuối) - nảy lên rồi settle
            const bounceProgress = (progress - 0.6) / 0.4;
            const bounce = Math.sin(bounceProgress * Math.PI * 2) * 0.1 * (1 - bounceProgress);
            easeProgress = 1 - bounce; // 1 = target position, bounce = nảy lên/xuống
          }

          // Animate từ top xuống target position với bounce
          const animatedY = charm.startY + (charm.y - charm.startY) * easeProgress;
          y = (animatedY / 100) * height;
        }
      }

      ctx.save();

      // Highlight charm đang được drag
      if (draggedCharm && charm.id === draggedCharm.id) {
        ctx.shadowColor = '#0066cc';
        ctx.shadowBlur = 10;
      }
      // Glow effect cho falling charms
      else if (isAnimating) {
        const elapsed = Date.now() - charm.fallStartTime;
        const progress = Math.min(elapsed / 700, 1);

        // Intensify glow during bounce phase
        if (progress > 0.6) {
          const bouncePhase = (progress - 0.6) / 0.4;
          const intensity = 1 + Math.sin(bouncePhase * Math.PI * 2) * 0.5;
          ctx.shadowColor = '#ffed4e';
          ctx.shadowBlur = 12 * intensity;
          ctx.globalAlpha = 0.9 + 0.1 * intensity;
        } else {
          ctx.shadowColor = '#ffed4e';
          ctx.shadowBlur = 12;
          ctx.globalAlpha = 0.9;
        }
      }

      drawCharm(ctx, charm, x, y);
      ctx.restore();
    });

    // Draw selection handles for selected charm
    if (selectedCharm) {
      const selected = dropped.find(c => c.id === selectedCharm.id);
      if (selected) {
        drawSelectionHandles(ctx, selected, width, height);
      }
    }
    // Draw drop zone
    if (isDrawingZone) {
      drawDropZone(ctx, tempZonePoints, width, height, true);
    } else if (dropZone.length > 0) {
      drawDropZone(ctx, dropZone, width, height, false);
    }
  }, [title, dropped, backgroundImage, useImageBackground, charmImages, draggedCharm, selectedCharm, dropZone, isDrawingZone, tempZonePoints]);

  // Animation timer cho falling charms
  useEffect(() => {
    const hasFalling = dropped.some(charm => charm.isFalling);
    let intervalId;

    if (hasFalling) {
      // Re-render mỗi 16ms (~60fps) khi có falling animation
      intervalId = setInterval(() => {
        setDropped(prev => [...prev]); // Trigger re-render
      }, 16);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [dropped.filter(c => c.isFalling).length]);

  // Thêm global mouse events để handle dragging/resizing khi chuột ra ngoài canvas
  useEffect(() => {
    if (isDragging || isResizing) {
      const handleGlobalMouseMove = (e) => handleCanvasMouseMove(e);
      const handleGlobalMouseUp = () => handleCanvasMouseUp();

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isResizing, draggedCharm, selectedCharm, resizeHandle, resizeStart]);

  const onDragStart = (e, type) => {
    e.dataTransfer.setData("text/plain", type);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    if (!type) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Drag & Drop: LUÔN xuất hiện ngay tại vị trí thả (không animation)
    setDropped((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, type, x, y },
    ]);
  };

  const removeCharm = (id) => {
    setDropped((prev) => prev.filter((c) => c.id !== id));
  };

  // Click to drop charm - rơi từ trên xuống
  const handleCharmClick = (charmType) => {
    console.log('🎯 Charm clicked:', charmType);

    // Get valid position (random or inside zone)
    const { x, y } = getValidDropPosition();

    const newCharm = {
      id: `${Date.now()}-${Math.random()}`,
      type: charmType,
      x: x,
      y: y,
      // Animation states
      isFalling: true,
      fallStartTime: Date.now(),
      startY: 0 // bắt đầu từ top
    };

    // Thêm charm với animation
    setDropped(prev => [...prev, newCharm]);

    // Sau 700ms, tắt animation (để có đủ time cho bounce)
    setTimeout(() => {
      setDropped(prev => prev.map(charm =>
        charm.id === newCharm.id
          ? { ...charm, isFalling: false, fallStartTime: undefined, startY: undefined }
          : charm
      ));
    }, 700);
  };

  // Tìm charm tại vị trí click
  const getCharmAtPosition = (x, y, canvasRect) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const canvasX = ((x - canvasRect.left) / canvasRect.width) * 100;
    const canvasY = ((y - canvasRect.top) / canvasRect.height) * 100;

    // Kiểm tra từng charm - tính theo scale
    return dropped.find(charm => {
      const scale = charm.scale || 1;
      const charmSize = 8 * scale; // base size 8%
      const dx = Math.abs(charm.x - canvasX);
      const dy = Math.abs(charm.y - canvasY);
      return dx < charmSize / 2 && dy < charmSize / 2;
    });
  };

  // Detect handle tại vị trí click  
  const getHandleAtPosition = (clientX, clientY, canvasRect, charm) => {
    if (!charm) return null;

    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const x = (charm.x / 100) * canvasWidth;
    const y = (charm.y / 100) * canvasHeight;
    const scale = charm.scale || 1;
    const size = 40 * scale;
    const handleSize = 12; // Larger hit area
    const padding = 5;
    const boxSize = size + padding * 2;

    // Convert client coords to canvas coords
    const canvasX = ((clientX - canvasRect.left) / canvasRect.width) * canvasWidth;
    const canvasY = ((clientY - canvasRect.top) / canvasRect.height) * canvasHeight;

    // Transform to charm's local coordinate system (accounting for rotation)
    const rotation = ((charm.rotation || 0) * Math.PI) / 180;
    const dx = canvasX - x;
    const dy = canvasY - y;
    const localX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
    const localY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);

    // Corner handles - for rotation
    const corners = [
      { name: 'nw', x: -boxSize / 2, y: -boxSize / 2 },
      { name: 'ne', x: boxSize / 2, y: -boxSize / 2 },
      { name: 'se', x: boxSize / 2, y: boxSize / 2 },
      { name: 'sw', x: -boxSize / 2, y: boxSize / 2 },
    ];

    // Edge handles - for scaling
    const edges = [
      { name: 'n', x: 0, y: -boxSize / 2 },
      { name: 'e', x: boxSize / 2, y: 0 },
      { name: 's', x: 0, y: boxSize / 2 },
      { name: 'w', x: -boxSize / 2, y: 0 },
    ];

    // Check corners first (rotation)
    for (const corner of corners) {
      const distX = Math.abs(localX - corner.x);
      const distY = Math.abs(localY - corner.y);
      if (distX < handleSize && distY < handleSize) {
        return { type: 'rotate', name: corner.name };
      }
    }

    // Check edges (scaling)
    for (const edge of edges) {
      const distX = Math.abs(localX - edge.x);
      const distY = Math.abs(localY - edge.y);
      if (distX < handleSize && distY < handleSize) {
        return { type: 'scale', name: edge.name };
      }
    }

    // Check delete button (at top of selection box)
    const deleteY = -boxSize / 2 - 18;
    const deleteDistX = Math.abs(localX);
    const deleteDistY = Math.abs(localY - deleteY);
    if (deleteDistX < 10 && deleteDistY < 10) {
      return { type: 'delete', name: 'delete' };
    }

    return null;
  };

  // Mouse events cho canvas
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Drawing mode
    if (isDrawingZone) {
      setTempZonePoints(prev => [...prev, { x, y }]);
      return;
    }

    // Nếu có charm đang selected, kiểm tra xem click vào handle không
    if (selectedCharm) {
      const selected = dropped.find(c => c.id === selectedCharm.id);
      if (selected) {
        const handle = getHandleAtPosition(e.clientX, e.clientY, rect, selected);
        if (handle) {
          // Handle delete
          if (handle.type === 'delete') {
            setDropped(prev => prev.filter(c => c.id !== selectedCharm.id));
            setSelectedCharm(null);
            return;
          }

          // Handle resize/rotate
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStart({
            x: e.clientX,
            y: e.clientY,
            scale: selected.scale || 1,
            rotation: selected.rotation || 0,
            charmX: (selected.x / 100) * canvas.width,
            charmY: (selected.y / 100) * canvas.height,
          });
          return;
        }
      }
    }

    // Check if clicking on a charm
    const charm = getCharmAtPosition(e.clientX, e.clientY, rect);

    if (charm) {
      // Select charm for resize/rotate
      setSelectedCharm(charm);
      setDraggedCharm(charm);
      setIsDragging(true);
      canvas.style.cursor = 'grabbing';
    } else {
      // Click outside - deselect
      setSelectedCharm(null);
    }
  };

  const handleCanvasDoubleClick = () => {
    if (isDrawingZone && tempZonePoints.length >= 3) {
      setDropZone(tempZonePoints);
      setIsDrawingZone(false);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Handle resizing/rotating
    if (isResizing && resizeHandle && selectedCharm && resizeStart) {
      const selected = dropped.find(c => c.id === selectedCharm.id);
      if (!selected) return;

      if (resizeHandle.type === 'rotate') {
        // Calculate rotation based on angle from charm center
        const charmCenterX = resizeStart.charmX;
        const charmCenterY = resizeStart.charmY;

        const startAngle = Math.atan2(
          ((resizeStart.y - rect.top) / rect.height) * canvas.height - charmCenterY,
          ((resizeStart.x - rect.left) / rect.width) * canvas.width - charmCenterX
        );
        const currentAngle = Math.atan2(
          ((e.clientY - rect.top) / rect.height) * canvas.height - charmCenterY,
          ((e.clientX - rect.left) / rect.width) * canvas.width - charmCenterX
        );

        const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
        const newRotation = resizeStart.rotation + angleDiff;

        setDropped(prev => prev.map(charm =>
          charm.id === selectedCharm.id
            ? { ...charm, rotation: newRotation }
            : charm
        ));
      } else if (resizeHandle.type === 'scale') {
        // Calculate scale based on distance from charm center
        const charmCenterX = resizeStart.charmX;
        const charmCenterY = resizeStart.charmY;

        const startDist = Math.sqrt(
          Math.pow(((resizeStart.x - rect.left) / rect.width) * canvas.width - charmCenterX, 2) +
          Math.pow(((resizeStart.y - rect.top) / rect.height) * canvas.height - charmCenterY, 2)
        );
        const currentDist = Math.sqrt(
          Math.pow(((e.clientX - rect.left) / rect.width) * canvas.width - charmCenterX, 2) +
          Math.pow(((e.clientY - rect.top) / rect.height) * canvas.height - charmCenterY, 2)
        );

        const scaleRatio = currentDist / startDist;
        const newScale = Math.max(0.3, Math.min(3, resizeStart.scale * scaleRatio)); // Limit scale 0.3x - 3x

        setDropped(prev => prev.map(charm =>
          charm.id === selectedCharm.id
            ? { ...charm, scale: newScale }
            : charm
        ));
      }
      return;
    }

    // Handle dragging
    if (!isDragging || !draggedCharm) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check constraints if drop zone exists
    if (dropZone.length >= 3 && !isPointInPolygon(x, y, dropZone)) {
      // If outside, don't update position (hard wall)
      return;
    }

    // Giới hạn trong canvas (5% margin từ edge)
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    setDropped(prev => prev.map(charm =>
      charm.id === draggedCharm.id
        ? { ...charm, x: clampedX, y: clampedY }
        : charm
    ));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedCharm(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  // Hover effect - change cursor when over charm or handle
  const handleCanvasMouseHover = (e) => {
    if (isDragging || isResizing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Check if hovering over a handle of selected charm
    if (selectedCharm) {
      const selected = dropped.find(c => c.id === selectedCharm.id);
      if (selected) {
        const handle = getHandleAtPosition(e.clientX, e.clientY, rect, selected);
        if (handle) {
          if (handle.type === 'rotate') {
            canvas.style.cursor = 'crosshair'; // Rotate cursor
          } else if (handle.type === 'scale') {
            // Direction-based resize cursors
            const cursorMap = {
              'n': 'ns-resize',
              's': 'ns-resize',
              'e': 'ew-resize',
              'w': 'ew-resize',
            };
            canvas.style.cursor = cursorMap[handle.name] || 'nwse-resize';
          } else if (handle.type === 'delete') {
            canvas.style.cursor = 'pointer'; // Delete cursor
          }
          return;
        }
      }
    }

    const charm = getCharmAtPosition(e.clientX, e.clientY, rect);
    canvas.style.cursor = charm ? 'grab' : 'default';
  };

  const CharmGroup = ({ label, value, onChange }) => (
    <div className="field">
      <label>
        <span className="req">*</span>
        {label}
      </label>
      <div className="charm-group">
        {charmList.map((c) => (
          <label
            key={c.value}
            draggable
            onDragStart={(e) => onDragStart(e, c.value)}
            onClick={(e) => {
              // Click to drop charm vào canvas
              handleCharmClick(c.value);
            }}
            className={`charm-card ${value === c.value ? "selected" : ""}`}
          >
            <input
              type="radio"
              name={label}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
            />
            {charmImages[c.value] ? (
              <img src={charmImages[c.value].src} alt={c.label} />
            ) : (
              <img src={c.img} alt={c.label} />
            )}
            <span>{c.label}</span>
            <small>Kéo để thả</small>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ padding: 20 }}>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Mở popup
        </button>
      </div>

      <div
        className={`overlay ${open ? "active" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        <div className="modal">
          <div className="modal-header">
            <strong>Tùy chỉnh ornament</strong>
            <button className="close" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div className="modal-body">
            <div
              className="preview"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                width={450}
                height={520}
                className="base"
                style={{ border: '2px solid #ccc', borderRadius: '8px' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseHover}
                onMouseUp={handleCanvasMouseUp}
                onDoubleClick={handleCanvasDoubleClick}
              />

              <div className="caption">
                Display is an approximate preview. By clicking "Customize now",
                you agree to these Terms and Conditions.
              </div>
            </div>

            <div className="form">
              <div className="field">
                <label htmlFor="title">
                  <span className="req">*</span>Enter The Title
                </label>
                <div className="input-row">
                  <input
                    id="title"
                    maxLength={maxLen}
                    value={title}
                    placeholder="input title"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="char-left">
                    {remaining} character(s) left
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="background-upload">
                  Background Image (Optional)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    id="background-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    style={{ flex: 1 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={useImageBackground}
                      onChange={(e) => setUseImageBackground(e.target.checked)}
                    />
                    Use Image
                  </label>
                </div>

                {/* Drop Zone Controls */}
                {useImageBackground && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {!isDrawingZone ? (
                      <>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setIsDrawingZone(true);
                            setTempZonePoints([]);
                            setDropZone([]);
                          }}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          ✏️ Vẽ vùng rơi
                        </button>
                        {dropZone.length > 0 && (
                          <button
                            className="btn-danger"
                            onClick={() => setDropZone([])}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#ffebee',
                              color: '#d32f2f',
                              border: '1px solid #ffcdd2'
                            }}
                          >
                            🗑️ Xóa vùng rơi
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#666' }}>Click để chấm điểm...</span>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            if (tempZonePoints.length >= 3) {
                              setDropZone(tempZonePoints);
                              setIsDrawingZone(false);
                            } else {
                              alert("Cần ít nhất 3 điểm để tạo vùng!");
                            }
                          }}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          ✓ Hoàn thành
                        </button>
                        <button
                          onClick={() => setIsDrawingZone(false)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: '#f5f5f5',
                            border: '1px solid #ddd'
                          }}
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <small>Upload a custom background image first to define drop zone</small>
              </div>


              {/* Single Charm Row - 3 options */}
              <div className="field">
                <label>
                  <span className="req">*</span>
                  Charms
                </label>
                <div className="charm-group">
                  {charmList.map((c) => (
                    <label
                      key={c.value}
                      draggable
                      onDragStart={(e) => onDragStart(e, c.value)}
                      onClick={() => handleCharmClick(c.value)}
                      className="charm-card"
                      style={{ cursor: 'pointer' }}
                    >
                      {charmImages[c.value] ? (
                        <img src={charmImages[c.value].src} alt={c.label} />
                      ) : (
                        <img src={c.img} alt={c.label} />
                      )}
                      <span>{c.label}</span>
                      <small>Click để thả rơi</small>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Custom Charm Images (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {charmList.map((charm) => (
                    <div key={charm.value} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {charm.label} Image:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCharmImageUpload(charm.value, e)}
                        style={{ fontSize: '11px' }}
                      />
                      {charmImages[charm.value] && (
                        <small style={{ color: 'green', fontSize: '10px' }}>✓ Image loaded</small>
                      )}
                    </div>
                  ))}
                </div>
                <small>Upload custom images to replace the default charm colors</small>
              </div>
            </div>
          </div>

          <div className="footer">
            <button className="btn-primary">Customize now</button>
          </div>
        </div>
      </div>
    </>
  );
}

