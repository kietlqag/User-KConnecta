FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY . .
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# JDK 21 tự nhận RAM container (Render Standard 2GB). Không cap heap/metaspace thủ công.
CMD ["sh", "-c", "unset JAVA_TOOL_OPTIONS && exec java -XX:+UseG1GC -Dserver.port=${PORT:-8080} -jar app.jar"]
