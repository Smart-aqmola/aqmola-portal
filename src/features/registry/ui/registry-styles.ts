import cabinet from "@/shared/ui/cabinet/cabinet.module.css";
import own from "./registry.module.css";

/** The shared cabinet styles with this section's own on top. */
const styles = { ...cabinet, ...own };

export default styles;
