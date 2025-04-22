import React from "react";

interface Props {
  value: string;
  login: string;
}

const ComContainer: React.FC<Props> = ({ value, login }) => {
  return (
    <div
      className="flex items-center justify-center  pt-14 px-10 pb-14 grid-center grid-cols-1 grid-flow-cols"
      style={{
        backgroundColor: "white",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        padding: "10px",
        marginLeft: "10%",
        marginTop: "2%",
        borderRadius: "10px",
        width: "50vw",
        height: "auto",
        border: "3px solid pink",
      }}>
      <div className="pb-2.5 font-bold">
        {login}
        <hr className="border-t-1 border-black w-full"></hr>
      </div>
      <div>{value}</div>
    </div>
  );
};

export default ComContainer;
