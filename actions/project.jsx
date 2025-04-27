

export const ProjectInfo = async (hash) => {
    try {
      const projectInfoResponse = await fetch(
        `${Config.PROJECT_URL}/project/${hash}/info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            cache: "no-cache",
          },
          body: JSON.stringify({}),
        }
      );
      if (projectInfoResponse.ok) {
        const response = await projectInfoResponse.json();
        return response;
      } else {
        return {
          error: "Failed to fetch project info",
        };
      }
    } catch (e) {
      console.log(e);
      Sentry.captureException(`projectInfo api fail hash:-${hash}`);
    }
  };