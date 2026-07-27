import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function ImageCropModal({
    isOpen,
    imageSrc,
    aspect,
    initialCropRect,
    onCancel,
    onSave,
}) {
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    // Normalize initial crop box (fractions 0 to 1)
    const [crop, setCrop] = useState(() => {
        if (initialCropRect && initialCropRect.width > 0) {
            return { ...initialCropRect };
        }
        return { x: 0, y: 0, width: 1, height: 1 };
    });

    const [freeform, setFreeform] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Reset crop if modal reopens with a new node
    useEffect(() => {
        if (initialCropRect && initialCropRect.width > 0) {
            setCrop({ ...initialCropRect });
        } else {
            setCrop({ x: 0, y: 0, width: 1, height: 1 });
        }
    }, [initialCropRect, isOpen]);

    const targetAspect = freeform ? null : (aspect || 1);

    // Handle pointer down on handles or the box itself
    const handlePointerDown = (e, handle) => {
        e.preventDefault();
        e.stopPropagation();
        if (!imgRef.current) return;

        const rect = imgRef.current.getBoundingClientRect();
        dragRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
            imgWidth: rect.width,
            imgHeight: rect.height,
        };
        setIsDragging(true);
    };

    // Pointer move handler for smooth dragging
    const handlePointerMove = useCallback((e) => {
        if (!dragRef.current) return;
        const { handle, startX, startY, startCrop, imgWidth, imgHeight } = dragRef.current;

        const dx = (e.clientX - startX) / imgWidth;
        const dy = (e.clientY - startY) / imgHeight;

        let { x, y, width, height } = startCrop;

        if (handle === 'move') {
            x = Math.max(0, Math.min(1 - width, startCrop.x + dx));
            y = Math.max(0, Math.min(1 - height, startCrop.y + dy));
        } else {
            let newX = x;
            let newY = y;
            let newW = width;
            let newH = height;

            if (handle.includes('e')) newW = Math.max(0.05, Math.min(1 - startCrop.x, startCrop.width + dx));
            if (handle.includes('s')) newH = Math.max(0.05, Math.min(1 - startCrop.y, startCrop.height + dy));

            if (handle.includes('w')) {
                const possibleW = startCrop.width - dx;
                if (possibleW >= 0.05 && startCrop.x + dx >= 0) {
                    newX = startCrop.x + dx;
                    newW = possibleW;
                }
            }
            if (handle.includes('n')) {
                const possibleH = startCrop.height - dy;
                if (possibleH >= 0.05 && startCrop.y + dy >= 0) {
                    newY = startCrop.y + dy;
                    newH = possibleH;
                }
            }

            // Enforce aspect ratio constraint when active
            if (targetAspect) {
                const boxAspectFactor = (targetAspect * imgHeight) / imgWidth;
                newH = newW / boxAspectFactor;

                if (newY + newH > 1) {
                    newH = 1 - newY;
                    newW = newH * boxAspectFactor;
                }
            }

            x = newX;
            y = newY;
            width = newW;
            height = newH;
        }

        setCrop({
            x: Math.max(0, Math.min(1 - width, x)),
            y: Math.max(0, Math.min(1 - height, y)),
            width: Math.max(0.05, Math.min(1, width)),
            height: Math.max(0.05, Math.min(1, height)),
        });
    }, [targetAspect]);

    const handlePointerUp = useCallback(() => {
        dragRef.current = null;
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }
    }, [isDragging, handlePointerMove, handlePointerUp]);

    if (!isOpen) return null;

    const handleReset = () => {
        setCrop({ x: 0, y: 0, width: 1, height: 1 });
    };

    const handleSave = () => {
        onSave({
            x: Math.max(0, Math.min(1, crop.x)),
            y: Math.max(0, Math.min(1, crop.y)),
            width: Math.max(0.01, Math.min(1, crop.width)),
            height: Math.max(0.01, Math.min(1, crop.height)),
        });
    };

    // Percentages for absolute positioning over the preview image
    const leftPct = `${crop.x * 100}%`;
    const topPct = `${crop.y * 100}%`;
    const widthPct = `${crop.width * 100}%`;
    const heightPct = `${crop.height * 100}%`;

    const s = {
        overlay: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            userSelect: 'none',
        },
        modal: {
            backgroundColor: '#242424', color: '#e8eaed', width: '600px', maxWidth: '94vw',
            borderRadius: '10px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
        },
        header: {
            padding: '14px 20px', fontWeight: '600', fontSize: '15px',
            borderBottom: '1px solid #333', backgroundColor: '#1e1e1e',
        },
        cropArea: {
            position: 'relative', width: '100%', height: '400px', backgroundColor: '#121212',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            padding: '16px', boxSizing: 'border-box',
        },
        controls: {
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid #333', backgroundColor: '#2a2a2a', fontSize: '13px',
        },
        footer: {
            padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid #333', backgroundColor: '#1e1e1e',
        },
        handle: {
            position: 'absolute', width: '12px', height: '12px', backgroundColor: '#0078d4',
            border: '2px solid #ffffff', borderRadius: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 10,
        },
    };

    return (
        <div style={s.overlay} onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div style={s.modal} onPointerDown={(e) => e.stopPropagation()}>
                <div style={s.header}>Crop Image</div>

                {/* Interactive Image Container */}
                <div style={s.cropArea}>
                    <div style={{ position: 'relative', display: 'inline-block', maxHeight: '100%', maxWidth: '100%' }}>
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop target"
                            style={{
                                display: 'block',
                                maxHeight: '368px',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Darkened overlay outside crop box */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                  ${leftPct} ${topPct},
                  ${leftPct} calc(${topPct} + ${heightPct}),
                  calc(${leftPct} + ${widthPct}) calc(${topPct} + ${heightPct}),
                  calc(${leftPct} + ${widthPct}) ${topPct},
                  ${leftPct} ${topPct}
                )`,
                            }}
                        />

                        {/* Resizable / Movable Crop Box */}
                        <div
                            onPointerDown={(e) => handlePointerDown(e, 'move')}
                            style={{
                                position: 'absolute',
                                left: leftPct,
                                top: topPct,
                                width: widthPct,
                                height: heightPct,
                                border: '1.5px solid #0078d4',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.4)',
                                cursor: 'move',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* Corner Handles */}
                            <div style={{ ...s.handle, left: '0%', top: '0%', cursor: 'nwse-resize' }} onPointerDown={(e) => handlePointerDown(e, 'nw')} />
                            <div style={{ ...s.handle, left: '100%', top: '0%', cursor: 'nesw-resize' }} onPointerDown={(e) => handlePointerDown(e, 'ne')} />
                            <div style={{ ...s.handle, left: '0%', top: '100%', cursor: 'nesw-resize' }} onPointerDown={(e) => handlePointerDown(e, 'sw')} />
                            <div style={{ ...s.handle, left: '100%', top: '100%', cursor: 'nwse-resize' }} onPointerDown={(e) => handlePointerDown(e, 'se')} />
                        </div>
                    </div>
                </div>

                {/* Modal Controls */}
                <div style={s.controls}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={freeform}
                            onChange={(e) => setFreeform(e.target.checked)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        <span>Free-form crop (unlock aspect ratio)</span>
                    </label>
                </div>

                {/* Modal Footer */}
                <div style={s.footer}>
                    <button
                        onClick={handleReset}
                        style={{ background: 'transparent', border: 'none', color: '#9aa0a6', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                    >
                        Reset Crop
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onCancel}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #4a4a4a', background: 'transparent', color: '#e8eaed', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#0078d4', color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}