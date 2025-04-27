"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginSubmission } from "../../actions/api";
import Input from "../Components/Input";
import Button from "../Components/Button";
import { setItem, getItem, removeItem } from "../../Utils/indexedDbHelper";
import { ImSpinner9 } from "react-icons/im";
import Image from "next/image";

export default function LoginPage({ projectInfo, id }) {
  const [errorMessage, setErrorMessage] = useState(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeProject = async () => {
      try {
        const oldId = await getItem("id");
        if (id !== oldId) {
          removeItem("id");
          removeItem("employeeData");
          removeItem("formData");
          removeItem("projectInfo");
        }
        setItem("projectInfo", projectInfo);
        await setItem("id", id);
        const employeeData = await getItem("employeeData");
        if (!projectInfo.features.includes("default_employee") && employeeData)
          router.push(`${id}/doctor-list`);
      } catch (error) {
        console.log("Error initializing project:", error);
      }
    };

    initializeProject();
  }, [projectInfo, router, id]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.target);
    const code = formData.get("employee_code");

    try {
      const result = await LoginSubmission(code);
      console.log(result)
      console.log(result?.data?.employee?.team)
      console.log(result?.data?.employee?.team?.length > 0)


      if (result.success && result.data.employee.team.length === 0 && result.data.employee.role===1) {
        await setItem("employeeData", result.data.employee);
        setPending(false);
        router.push(`${id}/doctor-list`);
      }
      else if (result.success && result.data.employee.role !==1){
          localStorage.setItem('logindata',JSON.stringify(result))
          router.push(`${id}/roles`)
      }
      else {
        setErrorMessage(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setPending(false);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setTimeout(() => {
        setPending(false);
        setErrorMessage(null);
      }, 2000);
    }
  };

  if (projectInfo?.closed_at) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <span className="text-lg font-semibold text-gray-600">
          The E-Video Platform is closed
        </span>
        <span className="text-2xl font-bold mt-1 text-sky-500">
          {projectInfo.closed_at}
        </span>
      </div>
    );
  }
  return (
    <div className="max-h-[100dvh] flex flex-col">
      {projectInfo?.top_banner && (
        <Image
          src={projectInfo?.top_banner}
          width={0}
          height={0}
          alt={projectInfo?.name}
          sizes="100vw"
          className="w-full"
        />
      )}
      <div className="relative py-3 sm:max-w-xl sm:mx-auto mt-20 mx-4">
        <div className="absolute inset-0 bg-animation shadow-lg transform -skew-y-6 sm:skew-y-0 -rotate-6 rounded-3xl px-4" />
        <div className="relative px-4 py-10 bg-white shadow-lg rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-semibold">
              {projectInfo?.settings?.form_title || "Login Form"}
            </h1>
            <form onSubmit={handleLogin} className="divide-y divide-gray-200">
              <div className="py-8 text-base space-y-4 text-gray-700 sm:text-lg">
                <Input
                  id="employee_code"
                  type="text"
                  placeholder={
                    projectInfo?.text?.employee_code_placeholder ||
                    "Enter Employee Code"
                  }
                  text={projectInfo?.texts?.employee_code || "Employee Code"}
                  errorMessage={errorMessage}
                  autoComplete={false}
                />
                <div className="relative">
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <ImSpinner9 className="animate-spin h-6 w-6 mx-auto mr-2" />{" "}
                        {"please wait"}{" "}
                      </>
                    ) : (
                      <p className="text-xl font-bold">
                        {projectInfo.texts?.login_button || "Login"}
                      </p>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {projectInfo?.bottom_banner && (
        <div
          className="fixed top-0 left-0 w-full h-full"
          style={{
            zIndex: -1,
            backgroundImage: `url(${projectInfo.top_banner})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
          }}
        />
      )}

      <div className="text-xs text-gray-500 mt-20 text-center">
        <p>Powered by</p>
        <p className="text-sm font-medium text-gray-700">PixPro.app</p>
      </div>
    </div>
  );
}