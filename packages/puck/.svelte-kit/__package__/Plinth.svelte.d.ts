type $$ComponentProps = {
    R: number;
    title: string;
    date: string;
    shadow: number;
    /** how visible the lettering is, 0 to 1 (the stage fades it out and back in between places) */
    lettering?: () => number;
};
declare const Plinth: import("svelte").Component<$$ComponentProps, {}, "">;
type Plinth = ReturnType<typeof Plinth>;
export default Plinth;
