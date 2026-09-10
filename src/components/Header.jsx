import React  from "react";
import styles from "../styles/Header.module.css";

export default function Home() {


  const sections = [
    { image: "public/image1.PNG" },
    { image: "public/3.png" },
    { image: "public/2.png" },
    { image: "public/1.png" },
    // { image: "/newimage.jpg" }, 
  ];

  return (
    <div className={styles.container}>

      {sections.map((sec, index) => (
        <section
          key={index}

          className={styles.section}
          style={{
            backgroundImage: `url(${sec.image})`,
          }}
        />
      ))}

    </div>
  );
}