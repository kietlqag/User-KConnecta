FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY . .
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Render free tier ~512MB RAM. Unset dashboard JAVA_TOOL_OPTIONS and cap JVM explicitly.
CMD ["sh", "-c", "unset JAVA_TOOL_OPTIONS && exec java -Xms128m -Xmx300m -XX:MaxMetaspaceSize=128m -XX:+UseG1GC -Dserver.port=${PORT:-8080} -jar app.jar"]
