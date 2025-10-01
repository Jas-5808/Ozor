  const handlePasswordSubmit = async (phone: string, password: string) => {
    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.signup(phone, password);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await authAPI.signin(phone, password);

      if (response.data.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }

      setIsPasswordModalOpen(false);
      navigate("/profile");
    } catch (err: any) {
      // Проверяем, если это 409 ошибка с сообщением "record already exists"
      if (err.response && err.response.status === 409 && 
          err.response.data?.detail?.includes("record already exists")) {
        // Обрабатываем как успех и переходим на страницу обновления профиля
        try {
          const response = await authAPI.signin(phone, password);
          
          if (response.data.access_token) {
            localStorage.setItem("access_token", response.data.access_token);
          }
          if (response.data.refresh_token) {
            localStorage.setItem("refresh_token", response.data.refresh_token);
          }

          setIsPasswordModalOpen(false);
          navigate("/update-profile");
        } catch (signinErr) {
          setError("Ошибка при входе в аккаунт. Попробуйте еще раз.");
          console.error("Ошибка входа:", signinErr);
        }
      } else {
        setError("Ошибка при создании аккаунта. Попробуйте еще раз.");
        console.error("Ошибка создания аккаунта:", err);
      }
    } finally {
      setTelegramLoading(false);
    }
  };
