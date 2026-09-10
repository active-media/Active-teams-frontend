
import styles from "../styles/Header.module.css";

export default function Home() {


  const sections = [
    { image: "/image1.PNG" },
    { image: "/3.png" },
    { image: "/2.png" },
    { image: "/1.png" },
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