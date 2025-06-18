ARG BUILD_FROM
FROM $BUILD_FROM

# Add env
ENV LANG C.UTF-8

# Copy data
COPY data/run.sh /
COPY index.js /script
COPY package.json /script
COPY package-lock.json /script

RUN  cd /script && \
     npm install

CMD [ "/run.sh" ]
