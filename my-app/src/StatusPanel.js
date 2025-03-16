// React JSX Component
import './StatusPanel.css';

const StatusPanel = (isBoundingBoxShown) => {
return (
    <div className="status-panel">
    {/* <div>
        <span className={`status-indicator ${areLandmarksShown ? 'status-on' : 'status-off'}`}></span>
        Landmarks: {areLandmarksShown ? 'Detected' : 'Not Detected'}
    </div> */}
    <div>
          <span className={`status-indicator ${isBoundingBoxShown ? 'status-on' : 'status-off'}`}></span>
          {isBoundingBoxShown ? 'Correct' : 'Incorrect'}
        </div>
      </div>
    );
  };
  
export default StatusPanel;