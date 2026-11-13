/** until when (performance.now) the globe should run at full speed: transitions set it */
export declare const pace: {
    busyUntil: number;
};
/** keep full speed for the next `ms` */
export declare const busy: (ms?: number) => number;
type $$ComponentProps = {
    playing: () => boolean;
};
declare const FrameGovernor: import("svelte").Component<$$ComponentProps, {}, "">;
type FrameGovernor = ReturnType<typeof FrameGovernor>;
export default FrameGovernor;
