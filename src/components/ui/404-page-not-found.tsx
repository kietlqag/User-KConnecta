"use client";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            <div
              className="bg-[url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain"
              aria-hidden="true"
            >
              <h1 className="text-center text-black dark:text-white text-6xl sm:text-7xl md:text-8xl pt-6 sm:pt-8 opacity-90">
                404
              </h1>
            </div>

            <div className="mt-[-20px] sm:mt-[-50px]">
              <h3 className="text-2xl text-black dark:text-white sm:text-3xl font-bold mb-4">
                Có vẻ như bạn đã bị lạc đường
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400 sm:mb-5">
                Trang bạn đang tìm kiếm hiện không khả dụng!
              </p>

              <Button
                variant="default"
                onClick={() => navigate("/")}
                className="my-5 bg-green-600 hover:bg-green-700 text-white px-8 h-11"
              >
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
