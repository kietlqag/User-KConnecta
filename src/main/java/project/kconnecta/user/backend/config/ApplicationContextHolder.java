package project.kconnecta.user.backend.config;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

/**
 * Lets JPA entity listeners (which are not Spring beans) look up Spring beans.
 * JPA instantiates entity listeners outside the Spring container, so we store
 * a static reference to ApplicationContext here after startup.
 */
@Component
public class ApplicationContextHolder implements ApplicationContextAware {

    private static ApplicationContext context;

    @Override
    public void setApplicationContext(@NonNull ApplicationContext ctx) {
        context = ctx;
    }

    public static <T> T getBean(Class<T> type) {
        return context.getBean(type);
    }

    public static boolean isReady() {
        return context != null;
    }
}
