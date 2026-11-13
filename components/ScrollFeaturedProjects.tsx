import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
} from "framer"

/**
 * ScrollFeaturedProjects
 *
 * Section "scrollytelling" à coller DIRECTEMENT sur la page (ne pas la
 * mettre dans un Stack ou un autre Frame qui "clippe" son contenu : le
 * composant gère lui-même sa hauteur, son sticky et son scroll).
 *
 * - Glisse ton composant "Scroll Media" existant dans le slot `scrollMedia`.
 *   Il reste pinné et défile pendant toute la longueur de la section.
 * - Le titre apparaît en overlay (fondu + léger déplacement) puis reste
 *   sticky jusqu'à la fin.
 * - Jusqu'à 4 stacks "Project" (tes propres composants) apparaissent
 *   ensuite, de la même manière, et restent en place.
 * - Un slot "More Projects" apparaît enfin.
 * - Une fois la section terminée (hauteur = `scrollLength`), la page
 *   reprend un scroll normal, automatiquement.
 *
 * Réglages importants pour que ça marche :
 * - Le calque de ce composant doit être en "Clip content" DÉSACTIVÉ.
 * - Pas besoin de le redimensionner à la main : `scrollLength` (en px,
 *   dans le panneau) fixe déjà sa hauteur réelle.
 */

interface FontControl {
    fontFamily?: string
    fontWeight?: string | number
    fontStyle?: string
    fontSize?: number
    letterSpacing?: number
    lineHeight?: number | string
}

type AnchorX = "left" | "center" | "right"
type AnchorY = "top" | "center" | "bottom"

interface StackSlot {
    component?: React.ReactNode
    enabled: boolean
    x: number
    y: number
    anchorX: AnchorX
    anchorY: AnchorY
}

interface Props {
    style?: React.CSSProperties
    scrollMedia?: React.ReactNode
    scrollLength: number

    titleText: string
    titleFont: FontControl
    titleColor: string
    titleRestTopVH: number
    titleEnterTopVH: number
    titleRevealStart: number
    titleRevealEnd: number

    project1Enabled: boolean
    project1Component?: React.ReactNode
    project1X: number
    project1Y: number
    project1AnchorX: AnchorX
    project1AnchorY: AnchorY

    project2Enabled: boolean
    project2Component?: React.ReactNode
    project2X: number
    project2Y: number
    project2AnchorX: AnchorX
    project2AnchorY: AnchorY

    project3Enabled: boolean
    project3Component?: React.ReactNode
    project3X: number
    project3Y: number
    project3AnchorX: AnchorX
    project3AnchorY: AnchorY

    project4Enabled: boolean
    project4Component?: React.ReactNode
    project4X: number
    project4Y: number
    project4AnchorX: AnchorX
    project4AnchorY: AnchorY

    stacksRevealStart: number
    stacksRevealEnd: number
    stackEnterOffset: number

    moreProjectsEnabled: boolean
    moreProjectsComponent?: React.ReactNode
    moreProjectsX: number
    moreProjectsY: number
    moreProjectsAnchorX: AnchorX
    moreProjectsAnchorY: AnchorY
    moreProjectsRevealStart: number
    moreProjectsRevealEnd: number
}

function anchorStyle(anchorX: AnchorX, anchorY: AnchorY, x: number, y: number): React.CSSProperties {
    const style: React.CSSProperties = { position: "absolute" }

    if (anchorX === "left") style.left = x
    else if (anchorX === "right") style.right = x
    else {
        style.left = `calc(50% + ${x}px)`
        style.transform = "translateX(-50%)"
    }

    if (anchorY === "top") style.top = y
    else if (anchorY === "bottom") style.bottom = y
    else {
        style.top = `calc(50% + ${y}px)`
        style.transform = (style.transform ? style.transform + " " : "") + "translateY(-50%)"
    }

    return style
}

// Calcule une progression locale (0 à 1) à l'intérieur d'une fenêtre de
// révélation, elle-même exprimée en fraction (0 à 1) du scroll total.
function bandProgress(progress: number, revealStart: number, revealEnd: number): number {
    const start = Math.max(0, Math.min(1, revealStart))
    const end = Math.max(start + 0.001, Math.min(1, revealEnd))
    return Math.max(0, Math.min(1, (progress - start) / (end - start)))
}

interface ScrollTrack {
    progress: number
    pinStyle: React.CSSProperties
}

// Suit le scroll de la page "à la main" (écouteur scroll + resize) plutôt
// que de passer par les hooks de scroll de framer-motion : certains
// montages de ces hooks plantent une fois publiés sur un site Framer
// ("Offsets must be null or in the range [0,1]"), ce calcul l'évite.
//
// Le "pin" de l'overlay est aussi calculé ici, en `position: fixed` tant
// qu'on est dans la zone de scroll, plutôt qu'en `position: sticky` :
// Framer insère parfois un conteneur parent avec un `overflow` qui casse
// le sticky natif, alors qu'un `fixed` piloté en JS reste fiable.
function useScrollTrack(ref: React.RefObject<HTMLDivElement>): ScrollTrack {
    const [state, setState] = React.useState<ScrollTrack>({
        progress: 0,
        pinStyle: { position: "absolute", top: 0, left: 0, width: "100%" },
    })

    React.useEffect(() => {
        let frame = 0

        const update = () => {
            frame = 0
            const el = ref.current
            if (!el) return

            const rect = el.getBoundingClientRect()
            const vh = window.innerHeight
            const scrollable = rect.height - vh

            const progress =
                scrollable <= 0
                    ? rect.top <= 0
                        ? 1
                        : 0
                    : Math.max(0, Math.min(1, -rect.top / scrollable))

            let pinStyle: React.CSSProperties
            if (rect.top > 0) {
                // Pas encore atteint : l'overlay suit le haut du composant.
                pinStyle = { position: "absolute", top: 0, left: 0, width: "100%" }
            } else if (rect.bottom <= vh) {
                // Durée de scroll écoulée : l'overlay se détache en bas du composant.
                pinStyle = { position: "absolute", bottom: 0, left: 0, width: "100%" }
            } else {
                // En cours : l'overlay reste pinné à l'écran.
                pinStyle = {
                    position: "fixed",
                    top: 0,
                    left: rect.left,
                    width: rect.width,
                }
            }

            setState({ progress, pinStyle })
        }

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }

        update()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [ref])

    return state
}

function RevealStack({
    slot,
    progress,
    revealStart,
    revealEnd,
    enterOffset,
}: {
    slot: StackSlot
    progress: number
    revealStart: number
    revealEnd: number
    enterOffset: number
}) {
    if (!slot.enabled || !slot.component) return null

    const t = bandProgress(progress, revealStart, revealEnd)
    const anchor = anchorStyle(slot.anchorX, slot.anchorY, slot.x, slot.y)
    const entranceTransform = `translateY(${enterOffset * (1 - t)}px)`

    return (
        <div
            style={{
                ...anchor,
                transform: anchor.transform
                    ? `${anchor.transform} ${entranceTransform}`
                    : entranceTransform,
                opacity: t,
                pointerEvents: "auto",
            }}
        >
            {slot.component}
        </div>
    )
}

export default function ScrollFeaturedProjects({ style, ...props }: Props) {
    const {
        scrollMedia,
        scrollLength,
        titleText,
        titleFont,
        titleColor,
        titleRestTopVH,
        titleEnterTopVH,
        titleRevealStart,
        titleRevealEnd,
        project1Enabled,
        project1Component,
        project1X,
        project1Y,
        project1AnchorX,
        project1AnchorY,
        project2Enabled,
        project2Component,
        project2X,
        project2Y,
        project2AnchorX,
        project2AnchorY,
        project3Enabled,
        project3Component,
        project3X,
        project3Y,
        project3AnchorX,
        project3AnchorY,
        project4Enabled,
        project4Component,
        project4X,
        project4Y,
        project4AnchorX,
        project4AnchorY,
        stacksRevealStart,
        stacksRevealEnd,
        stackEnterOffset,
        moreProjectsEnabled,
        moreProjectsComponent,
        moreProjectsX,
        moreProjectsY,
        moreProjectsAnchorX,
        moreProjectsAnchorY,
        moreProjectsRevealStart,
        moreProjectsRevealEnd,
    } = props

    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const { progress, pinStyle } = useScrollTrack(wrapperRef)

    const titleT = bandProgress(progress, titleRevealStart, titleRevealEnd)
    const titleTopVH = titleEnterTopVH + (titleRestTopVH - titleEnterTopVH) * titleT

    const stacks: StackSlot[] = [
        {
            component: project1Component,
            enabled: project1Enabled,
            x: project1X,
            y: project1Y,
            anchorX: project1AnchorX,
            anchorY: project1AnchorY,
        },
        {
            component: project2Component,
            enabled: project2Enabled,
            x: project2X,
            y: project2Y,
            anchorX: project2AnchorX,
            anchorY: project2AnchorY,
        },
        {
            component: project3Component,
            enabled: project3Enabled,
            x: project3X,
            y: project3Y,
            anchorX: project3AnchorX,
            anchorY: project3AnchorY,
        },
        {
            component: project4Component,
            enabled: project4Enabled,
            x: project4X,
            y: project4Y,
            anchorX: project4AnchorX,
            anchorY: project4AnchorY,
        },
    ]

    // Dans l'éditeur Framer (canvas), on affiche un aperçu statique en état
    // "final" pour pouvoir composer la mise en page sans avoir à scroller.
    if (isCanvas) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: style?.height ?? "100%",
                    overflow: "hidden",
                    background: "#eee",
                }}
            >
                <div style={{ position: "absolute", inset: 0 }}>{scrollMedia}</div>
                <div
                    style={{
                        position: "absolute",
                        top: `${titleRestTopVH}vh`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: titleColor,
                        whiteSpace: "nowrap",
                        ...titleFont,
                    }}
                >
                    {titleText}
                </div>
                {stacks.map((slot, i) =>
                    slot.enabled && slot.component ? (
                        <div key={i} style={anchorStyle(slot.anchorX, slot.anchorY, slot.x, slot.y)}>
                            {slot.component}
                        </div>
                    ) : null
                )}
                {moreProjectsEnabled && moreProjectsComponent ? (
                    <div
                        style={anchorStyle(
                            moreProjectsAnchorX,
                            moreProjectsAnchorY,
                            moreProjectsX,
                            moreProjectsY
                        )}
                    >
                        {moreProjectsComponent}
                    </div>
                ) : null}
            </div>
        )
    }

    return (
        <div
            ref={wrapperRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: scrollLength,
            }}
        >
            {/* Fond : ton composant Scroll Media, pinné (en JS, même mécanisme que
                l'overlay) + scrubé sur toute la durée */}
            <div style={{ ...pinStyle, height: "100vh", overflow: "hidden" }}>
                {scrollMedia}
            </div>

            {/* Overlay pinné en JS : reste visible sur un seul écran pendant toute l'animation */}
            <div
                style={{
                    ...pinStyle,
                    height: "100vh",
                    overflow: "hidden",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: `${titleTopVH}vh`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        opacity: titleT,
                        color: titleColor,
                        whiteSpace: "nowrap",
                        pointerEvents: "auto",
                        ...titleFont,
                    }}
                >
                    {titleText}
                </div>

                {stacks.map((slot, i) => (
                    <RevealStack
                        key={i}
                        slot={slot}
                        progress={progress}
                        revealStart={stacksRevealStart}
                        revealEnd={stacksRevealEnd}
                        enterOffset={stackEnterOffset}
                    />
                ))}

                <RevealStack
                    slot={{
                        component: moreProjectsComponent,
                        enabled: moreProjectsEnabled,
                        x: moreProjectsX,
                        y: moreProjectsY,
                        anchorX: moreProjectsAnchorX,
                        anchorY: moreProjectsAnchorY,
                    }}
                    progress={progress}
                    revealStart={moreProjectsRevealStart}
                    revealEnd={moreProjectsRevealEnd}
                    enterOffset={stackEnterOffset}
                />
            </div>
        </div>
    )
}

ScrollFeaturedProjects.defaultProps = {
    scrollLength: 4000,
    titleText: "Featured Projects",
    titleColor: "#111111",
    titleRestTopVH: 10,
    titleEnterTopVH: 15,
    titleRevealStart: 0.15,
    titleRevealEnd: 0.25,
    project1Enabled: true,
    project1X: 48,
    project1Y: 96,
    project1AnchorX: "left",
    project1AnchorY: "top",
    project2Enabled: true,
    project2X: 48,
    project2Y: 96,
    project2AnchorX: "right",
    project2AnchorY: "top",
    project3Enabled: true,
    project3X: 0,
    project3Y: 48,
    project3AnchorX: "center",
    project3AnchorY: "bottom",
    project4Enabled: false,
    project4X: 48,
    project4Y: 48,
    project4AnchorX: "left",
    project4AnchorY: "bottom",
    stacksRevealStart: 0.35,
    stacksRevealEnd: 0.45,
    stackEnterOffset: 24,
    moreProjectsEnabled: true,
    moreProjectsX: 48,
    moreProjectsY: 48,
    moreProjectsAnchorX: "right",
    moreProjectsAnchorY: "bottom",
    moreProjectsRevealStart: 0.75,
    moreProjectsRevealEnd: 0.85,
}

function projectControls(label: string) {
    return {
        Enabled: {
            type: ControlType.Boolean,
            title: `${label} — actif`,
        },
        Component: {
            type: ControlType.ComponentInstance,
            title: label,
        },
        X: {
            type: ControlType.Number,
            title: `${label} — X`,
        },
        Y: {
            type: ControlType.Number,
            title: `${label} — Y`,
        },
        AnchorX: {
            type: ControlType.Enum,
            title: `${label} — ancrage X`,
            options: ["left", "center", "right"],
            optionTitles: ["Gauche", "Centre", "Droite"],
        },
        AnchorY: {
            type: ControlType.Enum,
            title: `${label} — ancrage Y`,
            options: ["top", "center", "bottom"],
            optionTitles: ["Haut", "Centre", "Bas"],
        },
    }
}

function withPrefix(prefix: string, controls: Record<string, any>) {
    const out: Record<string, any> = {}
    for (const key in controls) {
        out[`${prefix}${key}`] = controls[key]
    }
    return out
}

addPropertyControls(ScrollFeaturedProjects, {
    scrollMedia: {
        type: ControlType.ComponentInstance,
        title: "Scroll Media",
    },
    scrollLength: {
        type: ControlType.Number,
        title: "Durée totale (px)",
        min: 800,
        max: 20000,
        step: 100,
        defaultValue: 4000,
    },

    titleText: {
        type: ControlType.String,
        title: "Titre",
        defaultValue: "Featured Projects",
        displayTextArea: false,
    },
    titleFont: {
        type: ControlType.Font,
        title: "Typo titre",
        controls: "extended",
        defaultValue: { fontSize: 48, fontWeight: 600 },
    },
    titleColor: {
        type: ControlType.Color,
        title: "Couleur titre",
        defaultValue: "#111111",
    },
    titleRestTopVH: {
        type: ControlType.Number,
        title: "Position finale (vh)",
        min: 0,
        max: 50,
        defaultValue: 10,
    },
    titleEnterTopVH: {
        type: ControlType.Number,
        title: "Position de départ (vh)",
        min: 0,
        max: 50,
        defaultValue: 15,
    },
    titleRevealStart: {
        type: ControlType.Number,
        title: "Titre : début (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.15,
    },
    titleRevealEnd: {
        type: ControlType.Number,
        title: "Titre : fin (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.25,
    },

    ...withPrefix("project1", projectControls("Project 1")),
    ...withPrefix("project2", projectControls("Project 2")),
    ...withPrefix("project3", projectControls("Project 3")),
    ...withPrefix("project4", projectControls("Project 4")),

    stacksRevealStart: {
        type: ControlType.Number,
        title: "Stacks : début (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.35,
    },
    stacksRevealEnd: {
        type: ControlType.Number,
        title: "Stacks : fin (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.45,
    },
    stackEnterOffset: {
        type: ControlType.Number,
        title: "Décalage d'entrée (px)",
        min: 0,
        max: 200,
        defaultValue: 24,
    },

    moreProjectsEnabled: {
        type: ControlType.Boolean,
        title: "More Projects actif",
        defaultValue: true,
    },
    moreProjectsComponent: {
        type: ControlType.ComponentInstance,
        title: "More Projects",
    },
    moreProjectsX: {
        type: ControlType.Number,
        title: "More Projects X",
        defaultValue: 48,
    },
    moreProjectsY: {
        type: ControlType.Number,
        title: "More Projects Y",
        defaultValue: 48,
    },
    moreProjectsAnchorX: {
        type: ControlType.Enum,
        title: "Ancrage X",
        options: ["left", "center", "right"],
        optionTitles: ["Gauche", "Centre", "Droite"],
        defaultValue: "right",
    },
    moreProjectsAnchorY: {
        type: ControlType.Enum,
        title: "Ancrage Y",
        options: ["top", "center", "bottom"],
        optionTitles: ["Haut", "Centre", "Bas"],
        defaultValue: "bottom",
    },
    moreProjectsRevealStart: {
        type: ControlType.Number,
        title: "More Projects : début (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.75,
    },
    moreProjectsRevealEnd: {
        type: ControlType.Number,
        title: "More Projects : fin (0-1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.85,
    },
})
