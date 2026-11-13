import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
} from "framer"
import {
    motion,
    useScroll,
    useTransform,
    MotionValue,
} from "framer-motion"

/**
 * ScrollFeaturedProjects
 *
 * Section "scrollytelling" pour une page Framer :
 * - Glisse TON composant "Scroll Media" existant dans le slot `scrollMedia`
 *   (vidéo ou séquence d'images) : il reste pinné et défile pendant toute
 *   la longueur de la section.
 * - Le titre apparaît en overlay (fondu + léger déplacement) puis reste
 *   sticky jusqu'à la fin.
 * - Jusqu'à 4 stacks "Project" (tes propres composants, mis en page par
 *   toi) apparaissent ensuite, de la même manière, et restent en place.
 * - Un slot "More Projects" apparaît enfin, en bas à droite par défaut.
 * - Une fois la section terminée, la page reprend un scroll normal.
 *
 * Tout le rythme (longueur totale + fenêtres d'apparition) est réglable
 * dans le panneau de droite, en "écrans" (1 = une hauteur de viewport).
 */

interface FontControl {
    fontFamily?: string
    fontWeight?: string | number
    fontStyle?: string
    fontSize?: number
    letterSpacing?: number
    lineHeight?: number | string
}

interface StackSlot {
    component?: React.ReactNode
    enabled: boolean
    x: number
    y: number
    anchorX: "left" | "center" | "right"
    anchorY: "top" | "center" | "bottom"
}

interface Props {
    scrollMedia?: React.ReactNode
    totalScreens: number

    titleText: string
    titleFont: FontControl
    titleColor: string
    titleRestTopVH: number
    titleEnterTopVH: number
    titleRevealStart: number
    titleRevealEnd: number

    project1: StackSlot
    project2: StackSlot
    project3: StackSlot
    project4: StackSlot
    stacksRevealStart: number
    stacksRevealEnd: number
    stackEnterOffset: number

    moreProjects?: React.ReactNode
    moreProjectsEnabled: boolean
    moreProjectsX: number
    moreProjectsY: number
    moreProjectsAnchorX: "left" | "center" | "right"
    moreProjectsAnchorY: "top" | "center" | "bottom"
    moreProjectsRevealStart: number
    moreProjectsRevealEnd: number
}

function anchorStyle(
    anchorX: StackSlot["anchorX"],
    anchorY: StackSlot["anchorY"],
    x: number,
    y: number
): React.CSSProperties {
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

function useBand(
    progress: MotionValue<number>,
    startScreen: number,
    endScreen: number,
    totalScreens: number
) {
    const safeTotal = totalScreens || 1
    const start = Math.max(0, Math.min(1, startScreen / safeTotal))
    const end = Math.max(start + 0.0001, Math.min(1, endScreen / safeTotal))
    const opacity = useTransform(progress, [start, end], [0, 1])
    return { opacity, start, end }
}

function RevealStack({
    slot,
    progress,
    totalScreens,
    revealStart,
    revealEnd,
    enterOffset,
}: {
    slot: StackSlot
    progress: MotionValue<number>
    totalScreens: number
    revealStart: number
    revealEnd: number
    enterOffset: number
}) {
    const { opacity, start, end } = useBand(progress, revealStart, revealEnd, totalScreens)
    const translateY = useTransform(progress, [start, end], [enterOffset, 0])

    if (!slot.enabled || !slot.component) return null

    return (
        <motion.div
            style={{
                ...anchorStyle(slot.anchorX, slot.anchorY, slot.x, slot.y),
                opacity,
                y: translateY,
                pointerEvents: "auto",
            }}
        >
            {slot.component}
        </motion.div>
    )
}

export default function ScrollFeaturedProjects(props: Props) {
    const {
        scrollMedia,
        totalScreens,
        titleText,
        titleFont,
        titleColor,
        titleRestTopVH,
        titleEnterTopVH,
        titleRevealStart,
        titleRevealEnd,
        project1,
        project2,
        project3,
        project4,
        stacksRevealStart,
        stacksRevealEnd,
        stackEnterOffset,
        moreProjects,
        moreProjectsEnabled,
        moreProjectsX,
        moreProjectsY,
        moreProjectsAnchorX,
        moreProjectsAnchorY,
        moreProjectsRevealStart,
        moreProjectsRevealEnd,
    } = props

    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const { scrollYProgress } = useScroll({
        target: wrapperRef,
        offset: ["start start", "end end"],
    })

    const titleBand = useBand(scrollYProgress, titleRevealStart, titleRevealEnd, totalScreens)
    const titleTop = useTransform(
        scrollYProgress,
        [titleBand.start, titleBand.end],
        [`${titleEnterTopVH}vh`, `${titleRestTopVH}vh`]
    )

    const stacks: StackSlot[] = [project1, project2, project3, project4]

    // Dans l'éditeur Framer (canvas), on affiche un aperçu statique en état
    // "final" pour pouvoir composer la mise en page sans avoir à scroller.
    if (isCanvas) {
        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
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
                {moreProjectsEnabled && moreProjects ? (
                    <div
                        style={anchorStyle(
                            moreProjectsAnchorX,
                            moreProjectsAnchorY,
                            moreProjectsX,
                            moreProjectsY
                        )}
                    >
                        {moreProjects}
                    </div>
                ) : null}
            </div>
        )
    }

    return (
        <div
            ref={wrapperRef}
            style={{
                position: "relative",
                width: "100%",
                height: `${Math.max(totalScreens, 1) * 100}vh`,
            }}
        >
            {/* Fond : ton composant Scroll Media, pinné + scrubé sur toute la durée */}
            <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {scrollMedia}
            </div>

            {/* Overlay sticky : reste visible sur un seul écran pendant toute l'animation */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    width: "100%",
                    height: "100vh",
                    overflow: "hidden",
                    pointerEvents: "none",
                }}
            >
                <motion.div
                    style={{
                        position: "absolute",
                        top: titleTop,
                        left: "50%",
                        transform: "translateX(-50%)",
                        opacity: titleBand.opacity,
                        color: titleColor,
                        whiteSpace: "nowrap",
                        pointerEvents: "auto",
                        ...titleFont,
                    }}
                >
                    {titleText}
                </motion.div>

                {stacks.map((slot, i) => (
                    <RevealStack
                        key={i}
                        slot={slot}
                        progress={scrollYProgress}
                        totalScreens={totalScreens}
                        revealStart={stacksRevealStart}
                        revealEnd={stacksRevealEnd}
                        enterOffset={stackEnterOffset}
                    />
                ))}

                <RevealStack
                    slot={{
                        component: moreProjects,
                        enabled: moreProjectsEnabled,
                        x: moreProjectsX,
                        y: moreProjectsY,
                        anchorX: moreProjectsAnchorX,
                        anchorY: moreProjectsAnchorY,
                    }}
                    progress={scrollYProgress}
                    totalScreens={totalScreens}
                    revealStart={moreProjectsRevealStart}
                    revealEnd={moreProjectsRevealEnd}
                    enterOffset={stackEnterOffset}
                />
            </div>
        </div>
    )
}

ScrollFeaturedProjects.defaultProps = {
    totalScreens: 10,
    titleText: "Featured Projects",
    titleColor: "#111111",
    titleRestTopVH: 10,
    titleEnterTopVH: 15,
    titleRevealStart: 2,
    titleRevealEnd: 3,
    stacksRevealStart: 4,
    stacksRevealEnd: 5,
    stackEnterOffset: 24,
    moreProjectsEnabled: true,
    moreProjectsX: 48,
    moreProjectsY: 48,
    moreProjectsAnchorX: "right",
    moreProjectsAnchorY: "bottom",
    moreProjectsRevealStart: 8,
    moreProjectsRevealEnd: 9,
}

function stackControls(label: string, defaults: Partial<StackSlot>) {
    return {
        type: ControlType.Object,
        title: label,
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Actif",
                defaultValue: defaults.enabled ?? false,
            },
            component: {
                type: ControlType.ComponentInstance,
                title: "Stack",
            },
            x: {
                type: ControlType.Number,
                title: "X",
                defaultValue: defaults.x ?? 0,
            },
            y: {
                type: ControlType.Number,
                title: "Y",
                defaultValue: defaults.y ?? 0,
            },
            anchorX: {
                type: ControlType.Enum,
                title: "Ancrage X",
                options: ["left", "center", "right"],
                optionTitles: ["Gauche", "Centre", "Droite"],
                defaultValue: defaults.anchorX ?? "left",
            },
            anchorY: {
                type: ControlType.Enum,
                title: "Ancrage Y",
                options: ["top", "center", "bottom"],
                optionTitles: ["Haut", "Centre", "Bas"],
                defaultValue: defaults.anchorY ?? "top",
            },
        },
    }
}

addPropertyControls(ScrollFeaturedProjects, {
    scrollMedia: {
        type: ControlType.ComponentInstance,
        title: "Scroll Media",
    },
    totalScreens: {
        type: ControlType.Number,
        title: "Durée totale (écrans)",
        min: 2,
        max: 40,
        step: 1,
        defaultValue: 10,
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
        title: "Titre : début (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 2,
    },
    titleRevealEnd: {
        type: ControlType.Number,
        title: "Titre : fin (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 3,
    },

    project1: stackControls("Project 1", { enabled: true, x: 48, y: 96, anchorX: "left", anchorY: "top" }),
    project2: stackControls("Project 2", { enabled: true, x: 48, y: 96, anchorX: "right", anchorY: "top" }),
    project3: stackControls("Project 3", { enabled: true, x: 0, y: 48, anchorX: "center", anchorY: "bottom" }),
    project4: stackControls("Project 4", { enabled: false, x: 48, y: 48, anchorX: "left", anchorY: "bottom" }),
    stacksRevealStart: {
        type: ControlType.Number,
        title: "Stacks : début (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 4,
    },
    stacksRevealEnd: {
        type: ControlType.Number,
        title: "Stacks : fin (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 5,
    },
    stackEnterOffset: {
        type: ControlType.Number,
        title: "Décalage d'entrée (px)",
        min: 0,
        max: 200,
        defaultValue: 24,
    },

    moreProjects: {
        type: ControlType.ComponentInstance,
        title: "More Projects",
    },
    moreProjectsEnabled: {
        type: ControlType.Boolean,
        title: "More Projects actif",
        defaultValue: true,
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
        title: "More Projects : début (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 8,
    },
    moreProjectsRevealEnd: {
        type: ControlType.Number,
        title: "More Projects : fin (écran)",
        min: 0,
        step: 0.1,
        defaultValue: 9,
    },
})
