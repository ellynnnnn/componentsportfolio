import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * WordMatchGame
 *
 * Jeu "relier les mots" : on fait glisser un trait depuis une case
 * de gauche (ou de droite) jusqu'à sa correspondance. Si la paire est
 * correcte le trait se fige dans la couleur de validation, sinon il
 * disparaît et l'élève peut retenter.
 *
 * À coller dans un Code Component Framer. Toutes les options visuelles
 * (typo, couleurs, tailles, nombre de paires, ordre) sont réglables
 * dans le panneau de droite, sans toucher au code.
 */

interface Pair {
    left: string
    right: string
}

interface Connection {
    leftIndex: number
    rightIndex: number
}

interface DragState {
    side: "left" | "right"
    index: number
    x: number
    y: number
}

interface FontControl {
    fontFamily?: string
    fontWeight?: string | number
    fontStyle?: string
    fontSize?: number
    letterSpacing?: number
    lineHeight?: number | string
}

interface Props {
    pairs: Pair[]
    randomizeRight: boolean
    manualOrder: number[]
    font: FontControl
    textColor: string
    boxFill: string
    boxBorderColor: string
    boxBorderWidth: number
    boxRadius: number
    boxPaddingX: number
    boxPaddingY: number
    rowGap: number
    columnGap: number
    idleLineColor: string
    correctLineColor: string
    lineWidth: number
}

export default function WordMatchGame(props: Props) {
    const {
        pairs,
        randomizeRight,
        manualOrder,
        font,
        textColor,
        boxFill,
        boxBorderColor,
        boxBorderWidth,
        boxRadius,
        boxPaddingX,
        boxPaddingY,
        rowGap,
        columnGap,
        idleLineColor,
        correctLineColor,
        lineWidth,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const leftRefs = React.useRef<Array<HTMLDivElement | null>>([])
    const rightRefs = React.useRef<Array<HTMLDivElement | null>>([])

    const [rightOrder, setRightOrder] = React.useState<number[]>([])
    const [connections, setConnections] = React.useState<Connection[]>([])
    const [drag, setDrag] = React.useState<DragState | null>(null)
    const [, forceTick] = React.useState(0)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // (re)calcule l'ordre de la colonne de droite quand les paires ou le mode changent
    React.useEffect(() => {
        const n = pairs.length
        if (randomizeRight) {
            const idx = Array.from({ length: n }, (_, i) => i)
            for (let i = idx.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[idx[i], idx[j]] = [idx[j], idx[i]]
            }
            setRightOrder(idx)
        } else {
            const manual = (manualOrder || [])
                .map((v) => Math.round(v) - 1)
                .filter((v) => v >= 0 && v < n)
            const used = new Set(manual)
            const rest = Array.from({ length: n }, (_, i) => i).filter(
                (i) => !used.has(i)
            )
            setRightOrder([...manual, ...rest].slice(0, n))
        }
        setConnections([])
        setDrag(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pairs.length, randomizeRight, JSON.stringify(manualOrder)])

    // recalcule la géométrie des traits quand le composant est redimensionné
    React.useEffect(() => {
        if (!containerRef.current) return
        const ro = new ResizeObserver(() => forceTick((t) => t + 1))
        ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [])

    function getAnchor(side: "left" | "right", index: number) {
        const container = containerRef.current
        const el =
            side === "left" ? leftRefs.current[index] : rightRefs.current[index]
        if (!container || !el) return null
        const cRect = container.getBoundingClientRect()
        const eRect = el.getBoundingClientRect()
        const x =
            side === "left" ? eRect.right - cRect.left : eRect.left - cRect.left
        const y = eRect.top - cRect.top + eRect.height / 2
        return { x, y }
    }

    function getPointer(e: { clientX: number; clientY: number }) {
        const container = containerRef.current
        if (!container) return { x: 0, y: 0 }
        const cRect = container.getBoundingClientRect()
        return { x: e.clientX - cRect.left, y: e.clientY - cRect.top }
    }

    function isMatched(side: "left" | "right", index: number) {
        return connections.some((c) =>
            side === "left" ? c.leftIndex === index : c.rightIndex === index
        )
    }

    function handlePointerDown(
        side: "left" | "right",
        index: number,
        e: React.PointerEvent
    ) {
        if (isCanvas) return
        if (isMatched(side, index)) return
        e.preventDefault()
        const p = getPointer(e)
        setDrag({ side, index, x: p.x, y: p.y })

        function onMove(ev: PointerEvent) {
            const pp = getPointer(ev)
            setDrag((d) => (d ? { ...d, x: pp.x, y: pp.y } : d))
        }

        function onUp(ev: PointerEvent) {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)

            const target = document.elementFromPoint(ev.clientX, ev.clientY)
            const dropSide = side === "left" ? "right" : "left"
            const refs = dropSide === "left" ? leftRefs : rightRefs

            let dropIndex = -1
            refs.current.forEach((node, i) => {
                if (node && target && node.contains(target)) dropIndex = i
            })

            if (dropIndex >= 0) {
                const leftIndex = side === "left" ? index : dropIndex
                const rightIndex = side === "left" ? dropIndex : index
                const leftPairIdx = leftIndex
                const rightPairIdx = rightOrder[rightIndex]
                if (
                    leftPairIdx === rightPairIdx &&
                    !isMatched("left", leftIndex) &&
                    !isMatched("right", rightIndex)
                ) {
                    setConnections((c) => [...c, { leftIndex, rightIndex }])
                }
            }
            setDrag(null)
        }

        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
    }

    const fontStyle: React.CSSProperties = {
        fontFamily: font?.fontFamily,
        fontWeight: font?.fontWeight as React.CSSProperties["fontWeight"],
        fontStyle: font?.fontStyle as React.CSSProperties["fontStyle"],
        fontSize: font?.fontSize,
        letterSpacing: font?.letterSpacing,
        lineHeight: font?.lineHeight,
        color: textColor,
    }

    const boxStyle = (matched: boolean): React.CSSProperties => ({
        display: "inline-block",
        background: boxFill,
        border: `${boxBorderWidth}px solid ${boxBorderColor}`,
        borderRadius: boxRadius,
        padding: `${boxPaddingY}px ${boxPaddingX}px`,
        cursor: matched ? "default" : "pointer",
        userSelect: "none",
        touchAction: "none",
        opacity: matched ? 0.55 : 1,
        whiteSpace: "nowrap",
        ...fontStyle,
    })

    const dragLine =
        drag &&
        (() => {
            const from = getAnchor(drag.side, drag.index)
            if (!from) return null
            return { from, to: { x: drag.x, y: drag.y } }
        })()

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "space-between",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: rowGap,
                    zIndex: 2,
                }}
            >
                {pairs.map((p, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            leftRefs.current[i] = el
                        }}
                        onPointerDown={(e) => handlePointerDown("left", i, e)}
                        style={boxStyle(isMatched("left", i))}
                    >
                        {p.left}
                    </div>
                ))}
            </div>

            <div style={{ width: columnGap, flexShrink: 0 }} />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: rowGap,
                    zIndex: 2,
                }}
            >
                {rightOrder.map((pairIdx, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            rightRefs.current[i] = el
                        }}
                        onPointerDown={(e) => handlePointerDown("right", i, e)}
                        style={boxStyle(isMatched("right", i))}
                    >
                        {pairs[pairIdx]?.right}
                    </div>
                ))}
            </div>

            <svg
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            >
                {connections.map((c, i) => {
                    const from = getAnchor("left", c.leftIndex)
                    const to = getAnchor("right", c.rightIndex)
                    if (!from || !to) return null
                    return (
                        <line
                            key={i}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke={correctLineColor}
                            strokeWidth={lineWidth}
                            strokeLinecap="round"
                        />
                    )
                })}
                {dragLine && (
                    <line
                        x1={dragLine.from.x}
                        y1={dragLine.from.y}
                        x2={dragLine.to.x}
                        y2={dragLine.to.y}
                        stroke={idleLineColor}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                    />
                )}
            </svg>
        </div>
    )
}

const defaultPairs: Pair[] = [
    { left: "UI/UX & Graphic Design Licence", right: "Gobelins Paris" },
    { left: "Erasmus / Projet Mona", right: "Germany / Fritz-Kola" },
    { left: "Apprenticeship", right: "Thales" },
]

WordMatchGame.defaultProps = {
    pairs: defaultPairs,
    randomizeRight: true,
    manualOrder: [],
    textColor: "#1a1a1a",
    boxFill: "#ffffff",
    boxBorderColor: "#000000",
    boxBorderWidth: 1.5,
    boxRadius: 4,
    boxPaddingX: 16,
    boxPaddingY: 10,
    rowGap: 24,
    columnGap: 160,
    idleLineColor: "#9a9a9a",
    correctLineColor: "#2f6fed",
    lineWidth: 2.5,
} as Props

addPropertyControls(WordMatchGame, {
    pairs: {
        type: ControlType.Array,
        title: "Paires de mots",
        control: {
            type: ControlType.Object,
            controls: {
                left: {
                    type: ControlType.String,
                    title: "Mot gauche",
                    defaultValue: "",
                },
                right: {
                    type: ControlType.String,
                    title: "Mot droit",
                    defaultValue: "",
                },
            },
        },
        defaultValue: defaultPairs,
        maxCount: 12,
    },
    randomizeRight: {
        type: ControlType.Boolean,
        title: "Ordre à droite",
        enabledTitle: "Aléatoire",
        disabledTitle: "Manuel",
        defaultValue: true,
    },
    manualOrder: {
        type: ControlType.Array,
        title: "Ordre manuel",
        control: { type: ControlType.Number, min: 1, step: 1, displayStepper: true },
        hidden: (props: Props) => props.randomizeRight,
    },
    font: {
        type: ControlType.Font,
        title: "Typographie",
        controls: "extended",
        defaultValue: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 16,
        },
    },
    textColor: {
        type: ControlType.Color,
        title: "Couleur texte",
        defaultValue: "#1a1a1a",
    },
    boxFill: {
        type: ControlType.Color,
        title: "Fond des cases",
        defaultValue: "#ffffff",
    },
    boxBorderColor: {
        type: ControlType.Color,
        title: "Bordure des cases",
        defaultValue: "#000000",
    },
    boxBorderWidth: {
        type: ControlType.Number,
        title: "Épaisseur bordure",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 1.5,
    },
    boxRadius: {
        type: ControlType.Number,
        title: "Arrondi des cases",
        min: 0,
        max: 40,
        defaultValue: 4,
    },
    boxPaddingX: {
        type: ControlType.Number,
        title: "Marge horizontale",
        min: 0,
        max: 60,
        defaultValue: 16,
    },
    boxPaddingY: {
        type: ControlType.Number,
        title: "Marge verticale",
        min: 0,
        max: 60,
        defaultValue: 10,
    },
    rowGap: {
        type: ControlType.Number,
        title: "Espace vertical",
        min: 0,
        max: 100,
        defaultValue: 24,
    },
    columnGap: {
        type: ControlType.Number,
        title: "Espace entre colonnes",
        min: 20,
        max: 400,
        defaultValue: 160,
    },
    idleLineColor: {
        type: ControlType.Color,
        title: "Trait (en cours)",
        defaultValue: "#9a9a9a",
    },
    correctLineColor: {
        type: ControlType.Color,
        title: "Trait (correct)",
        defaultValue: "#2f6fed",
    },
    lineWidth: {
        type: ControlType.Number,
        title: "Épaisseur du trait",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2.5,
    },
})
