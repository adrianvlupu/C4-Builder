FROM openjdk:11
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get update && apt-get install -y nodejs graphviz chromium xvfb

RUN npm i -g c4builder

# monkey patch c4builder with the latest plantUML version
RUN version="1.2023.10" \
    && cd "$(npm root -g)/c4builder" \
    && wget https://github.com/plantuml/plantuml/releases/download/v${version}/plantuml-${version}.jar -O ./vendor/plantuml-${version}.jar \
    && old_version=$(awk '/version:/ {match($2, /[0-9.]+/); v=substr($2, RSTART, RLENGTH)} /isLatest: true/ {print v}' utils.js | tr -d "',") \
    && sed -i "s/$old_version/$version/g" utils.js
#end monkey patch

RUN useradd defaultuser -u 1000 -s /bin/bash -d /home/defaultuser -m \
    && echo 'exec chromium $@ --no-sandbox --disable-setuid-sandbox' > /usr/bin/chromium.sh \
    && chmod a=xr /usr/bin/chromium.sh
    
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium.sh

USER defaultuser
VOLUME /pwd
CMD /bin/bash -c "echo Scanning for all .c4builder files in volume 'pwd' && \
Xvfb :99 -ac -screen 0 1280x720x16 -nolisten tcp -nolisten unix & disown $! && \
export DISPLAY=:99 && \
cd /pwd && \
find -name .c4builder -execdir c4builder \; \
&& echo FINISHED"