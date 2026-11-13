import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * PhysicsParticles
 *
 * Boîte de particules "rigides" (boulles de polystyrène / tas de feuilles)
 * qui tombent par gravité, se tassent au fond et réagissent à la souris
 * comme un bac à sable physique (Interactive Physics Sandbox). On peut
 * cliquer dans le cadre pour y lancer un objet qui fait bouger le tas.
 *
 * À coller dans un Code Component Framer. S'adapte automatiquement à la
 * taille du cadre (stack / frame) dans lequel il est placé.
 */

interface Props {
    particleCount: number
    particleColor: string
    particleOpacity: number
    particleSize: number
    sizeVariation: number
    forcePhysique: number
    allowDrop: boolean
    dropObjectColor: string
    dropObjectSize: number
    backgroundColor: string
}

interface Ball {
    x: number
    y: number
    vx: number
    vy: number
    r: number
    color: string
    opacity: number
    mass: number
}

const MAX_DROPPED = 24

export default function PhysicsParticles(props: Props) {
    const {
        particleCount,
        particleColor,
        particleOpacity,
        particleSize,
        sizeVariation,
        forcePhysique,
        allowDrop,
        dropObjectColor,
        dropObjectSize,
        backgroundColor,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const ballsRef = React.useRef<Ball[]>([])
    const droppedCountRef = React.useRef(0)
    const sizeRef = React.useRef({ width: 300, height: 300, dpr: 1 })
    const mouseRef = React.useRef<{
        x: number
        y: number
        vx: number
        vy: number
    } | null>(null)
    const rafRef = React.useRef<number | null>(null)

    const paramsRef = React.useRef({
        gravity: 0.3,
        mouseForce: 1,
        restitution: 0.25,
    })

    // constantes physiques dérivées du réglage unique "force physique"
    React.useEffect(() => {
        const f = Math.max(0, forcePhysique)
        paramsRef.current.gravity = 0.16 + f * 0.32
        paramsRef.current.mouseForce = f * 2.4
        paramsRef.current.restitution = Math.min(0.55, 0.12 + f * 0.14)
    }, [forcePhysique])

    // (re)génère les particules de base quand leurs réglages changent
    React.useEffect(() => {
        const { width } = sizeRef.current
        const n = Math.max(0, Math.round(particleCount))
        const balls: Ball[] = []
        for (let i = 0; i < n; i++) {
            const variance = 1 + (Math.random() * 2 - 1) * sizeVariation
            const r = Math.max(1.5, (particleSize * variance) / 2)
            balls.push({
                x: Math.random() * Math.max(1, width - 2 * r) + r,
                y: -Math.random() * 400 - r,
                vx: (Math.random() - 0.5) * 0.5,
                vy: 0,
                r,
                color: particleColor,
                opacity: particleOpacity,
                mass: r * r,
            })
        }
        ballsRef.current = balls
        droppedCountRef.current = 0
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [particleCount, particleSize, sizeVariation, particleColor, particleOpacity])

    // redimensionne le canvas pour épouser la taille du cadre Framer
    React.useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        function resize() {
            const rect = container.getBoundingClientRect()
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            sizeRef.current = { width: rect.width, height: rect.height, dpr }
            canvas.width = Math.max(1, Math.round(rect.width * dpr))
            canvas.height = Math.max(1, Math.round(rect.height * dpr))
            canvas.style.width = `${rect.width}px`
            canvas.style.height = `${rect.height}px`
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(container)
        return () => ro.disconnect()
    }, [])

    // boucle d'animation : gravité, collisions rigides, interaction souris
    React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        function step() {
            const { width, height, dpr } = sizeRef.current
            const balls = ballsRef.current
            const { gravity, mouseForce, restitution } = paramsRef.current
            const mouse = mouseRef.current

            for (const b of balls) {
                b.vy += gravity
                b.vx *= 0.985
                b.vy *= 0.99

                if (mouse) {
                    const dx = b.x - mouse.x
                    const dy = b.y - mouse.y
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
                    const influence = Math.max(30, Math.min(width, height) * 0.25)
                    if (dist < influence + b.r) {
                        const strength = (1 - dist / (influence + b.r)) * mouseForce
                        b.vx += (dx / dist) * strength
                        b.vy += (dy / dist) * strength
                        b.vx += mouse.vx * 0.12
                        b.vy += mouse.vy * 0.12
                    }
                }

                b.x += b.vx
                b.y += b.vy
            }

            // partitionnement spatial simple pour limiter les tests de collision
            const cell = Math.max(24, particleSize + dropObjectSize)
            const grid = new Map<string, number[]>()
            const key = (cx: number, cy: number) => `${cx}_${cy}`
            balls.forEach((b, i) => {
                const cx = Math.floor(b.x / cell)
                const cy = Math.floor(b.y / cell)
                const k = key(cx, cy)
                if (!grid.has(k)) grid.set(k, [])
                grid.get(k)!.push(i)
            })

            for (let iter = 0; iter < 3; iter++) {
                balls.forEach((a, i) => {
                    const cx = Math.floor(a.x / cell)
                    const cy = Math.floor(a.y / cell)
                    for (let ox = -1; ox <= 1; ox++) {
                        for (let oy = -1; oy <= 1; oy++) {
                            const neighbors = grid.get(key(cx + ox, cy + oy))
                            if (!neighbors) continue
                            for (const j of neighbors) {
                                if (j <= i) continue
                                const b = balls[j]
                                const dx = b.x - a.x
                                const dy = b.y - a.y
                                const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
                                const minDist = a.r + b.r
                                if (dist < minDist) {
                                    const overlap = minDist - dist
                                    const nx = dx / dist
                                    const ny = dy / dist
                                    const totalMass = a.mass + b.mass
                                    const aPush = overlap * (b.mass / totalMass)
                                    const bPush = overlap * (a.mass / totalMass)
                                    a.x -= nx * aPush
                                    a.y -= ny * aPush
                                    b.x += nx * bPush
                                    b.y += ny * bPush

                                    const rvx = b.vx - a.vx
                                    const rvy = b.vy - a.vy
                                    const velAlongNormal = rvx * nx + rvy * ny
                                    if (velAlongNormal < 0) {
                                        const impulse =
                                            (-(1 + restitution) * velAlongNormal) /
                                            (1 / a.mass + 1 / b.mass)
                                        a.vx -= (impulse / a.mass) * nx
                                        a.vy -= (impulse / a.mass) * ny
                                        b.vx += (impulse / b.mass) * nx
                                        b.vy += (impulse / b.mass) * ny
                                    }
                                }
                            }
                        }
                    }
                })
            }

            for (const b of balls) {
                if (b.x < b.r) {
                    b.x = b.r
                    b.vx = -b.vx * restitution
                } else if (b.x > width - b.r) {
                    b.x = width - b.r
                    b.vx = -b.vx * restitution
                }
                if (b.y > height - b.r) {
                    b.y = height - b.r
                    b.vy = -b.vy * restitution
                    b.vx *= 0.9
                    if (Math.abs(b.vy) < 0.05) b.vy = 0
                    if (Math.abs(b.vx) < 0.02) b.vx = 0
                } else if (b.y < -b.r * 6) {
                    b.y = -b.r * 6
                    b.vy = Math.max(b.vy, 0)
                }
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, width, height)
            for (const b of balls) {
                ctx.globalAlpha = b.opacity
                ctx.beginPath()
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
                ctx.fillStyle = b.color
                ctx.fill()
            }
            ctx.globalAlpha = 1

            rafRef.current = requestAnimationFrame(step)
        }

        rafRef.current = requestAnimationFrame(step)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [particleSize, dropObjectSize])

    function getLocalPoint(e: { clientX: number; clientY: number }) {
        const container = containerRef.current
        if (!container) return { x: 0, y: 0 }
        const rect = container.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function handlePointerMove(e: React.PointerEvent) {
        const p = getLocalPoint(e)
        const prev = mouseRef.current
        mouseRef.current = {
            x: p.x,
            y: p.y,
            vx: prev ? p.x - prev.x : 0,
            vy: prev ? p.y - prev.y : 0,
        }
    }

    function handlePointerLeave() {
        mouseRef.current = null
    }

    function handlePointerDown(e: React.PointerEvent) {
        if (!allowDrop) return
        const p = getLocalPoint(e)
        const r = Math.max(4, dropObjectSize / 2)
        const ball: Ball = {
            x: p.x,
            y: Math.max(r, p.y),
            vx: (Math.random() - 0.5) * 1.5,
            vy: 1,
            r,
            color: dropObjectColor,
            opacity: particleOpacity,
            mass: r * r * 1.4,
        }
        const balls = ballsRef.current
        if (droppedCountRef.current >= MAX_DROPPED) {
            const idx = balls.findIndex((b) => b.mass > (particleSize / 2) ** 2 * 1.3)
            if (idx >= 0) balls.splice(idx, 1)
            else droppedCountRef.current--
        } else {
            droppedCountRef.current++
        }
        balls.push(ball)
    }

    return (
        <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: backgroundColor,
                touchAction: "none",
                cursor: allowDrop ? "crosshair" : "default",
            }}
        >
            <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
    )
}

PhysicsParticles.defaultProps = {
    particleCount: 120,
    particleColor: "#ECE0C4",
    particleOpacity: 0.95,
    particleSize: 10,
    sizeVariation: 0.4,
    forcePhysique: 1,
    allowDrop: true,
    dropObjectColor: "#7A5C3E",
    dropObjectSize: 26,
    backgroundColor: "rgba(0,0,0,0)",
} as Props

addPropertyControls(PhysicsParticles, {
    particleCount: {
        type: ControlType.Number,
        title: "Nombre de particules",
        min: 10,
        max: 260,
        step: 5,
        defaultValue: 120,
    },
    particleColor: {
        type: ControlType.Color,
        title: "Couleur",
        defaultValue: "#ECE0C4",
    },
    particleOpacity: {
        type: ControlType.Number,
        title: "Opacité",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.95,
    },
    particleSize: {
        type: ControlType.Number,
        title: "Grosseur",
        min: 2,
        max: 40,
        step: 1,
        defaultValue: 10,
    },
    sizeVariation: {
        type: ControlType.Number,
        title: "Variation de taille",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.4,
    },
    forcePhysique: {
        type: ControlType.Number,
        title: "Force physique",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 1,
    },
    allowDrop: {
        type: ControlType.Boolean,
        title: "Lancer un objet",
        enabledTitle: "Activé",
        disabledTitle: "Désactivé",
        defaultValue: true,
    },
    dropObjectColor: {
        type: ControlType.Color,
        title: "Couleur objet lancé",
        defaultValue: "#7A5C3E",
        hidden: (props: Props) => !props.allowDrop,
    },
    dropObjectSize: {
        type: ControlType.Number,
        title: "Taille objet lancé",
        min: 10,
        max: 100,
        step: 2,
        defaultValue: 26,
        hidden: (props: Props) => !props.allowDrop,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Fond",
        defaultValue: "rgba(0,0,0,0)",
    },
})
