import { Button } from "react-bootstrap";

const Tooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
}) => {
  const { content, hideBackButton, locale, showSkipButton, title, styles } =
    step;
  const { back, close, last, next, skip } = locale;
  const output = {
    primary: close,
  };
  return (
    <div key="JoyrideTooltip" style={styles.tooltip}>
      <div style={styles.tooltipContainer}>
        {output.close}
        {title && <h4 style={styles.tooltipTitle}>{title}</h4>}
        {content && <div style={styles.tooltipContent}>{content}</div>}
      </div>
      <div style={styles.tooltipFooter}>
        {output.skip}
        {output.back}
        <button style={styles.buttonNext} {...primaryProps}>
          {output.primary}
        </button>
      </div>
    </div>
  );
};

export default Tooltip;
