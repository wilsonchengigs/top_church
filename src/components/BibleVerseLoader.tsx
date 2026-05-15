import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BibleVerseLoader({ verses }: { verses: readonly string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % verses.length);
    }, 2000); // 每 2 秒切換

    return () => clearInterval(interval);
  }, [verses]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center text-xl font-semibold text-gray-700 px-6"
        >
          {verses[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
