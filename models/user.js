const bcrypt = require('bcrypt');
const _ = require('lodash');
const { Model } = require('sequelize');

const SALT_ROUNDS = 10;

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Organization);
      User.belongsTo(models.User, { as: 'CreatedBy' });
      User.belongsTo(models.User, { as: 'UpdatedBy' });
      User.hasMany(models.HospitalUser, { foreignKey: 'edadminuser_uuid' });
      User.hasMany(models.HospitalUser.scope('active'), {
        as: 'ActiveHospitalUsers',
        foreignKey: 'edadminuser_uuid',
      });
    }

    toJSON() {
      const attributes = { ...this.get() };
      attributes.organization = this.Organization?.toJSON() || { id: this.OrganizationId };
      if (this.ActiveHospitalUsers) {
        attributes.activeHospitals = this.ActiveHospitalUsers.map((h) => h.toJSON());
      }
      return _.pick(attributes, [
        'id',
        'firstName',
        'lastName',
        'email',
        'isActive',
        'isAdminUser',
        'isOperationalUser',
        'isSuperUser',
        'organization',
        'activeHospitals',
      ]);
    }
  }

  User.init(
    {
      id: {
        field: 'user_uuid',
        type: DataTypes.UUID,
        primaryKey: true,
        autoIncrement: true,
      },
      OrganizationId: {
        field: 'organization_uuid',
        type: DataTypes.UUID,
      },
      firstName: {
        field: 'firstname',
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        field: 'lastname',
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.VIRTUAL(DataTypes.STRING, ['firstName', 'lastName']),
        get() {
          return `${this.firstName} ${this.lastName}`.trim();
        },
      },
      email: {
        field: 'email',
        type: DataTypes.CITEXT,
        unique: {
          msg: 'This email address has already been used.',
        },
        validate: {
          isEmail: {
            msg: 'This is not a valid email address.',
          },
        },
      },
      subjectId: {
        field: 'subjectid',
        type: DataTypes.STRING,
      },
      password: {
        type: new DataTypes.VIRTUAL(DataTypes.STRING),
        validate: {
          is: {
            args: [/^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{8,}$/],
            msg: 'At least 8 characters, including upper and lowercase letters, a number, and a symbol.',
          },
        },
      },
      hashedPassword: {
        field: 'hashedpassword',
        type: DataTypes.STRING,
      },
      ssoData: {
        field: 'ssodata',
        type: DataTypes.JSONB,
      },
      isOperationalUser: {
        field: 'operationaluserindicator',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isAdminUser: {
        field: 'administrativeuserindicator',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isSuperUser: {
        field: 'superuserindicator',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        field: 'activeindicator',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        field: 'recordcreatetimestamp',
        type: DataTypes.DATE,
      },
      CreatedById: {
        field: 'recordcreateuser_uuid',
        type: DataTypes.UUID,
      },
      updatedAt: {
        field: 'recordupdatetimestamp',
        type: DataTypes.DATE,
      },
      UpdatedById: {
        field: 'recordupdateuser_uuid',
        type: DataTypes.UUID,
      },
    },
    {
      sequelize,
      timestamps: true,
      tableName: 'batsuser',
      modelName: 'User',
    }
  );

  User.beforeSave(async (user) => {
    /// if a new password has been set, hash for storage
    if (user.password) {
      user.hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
  });

  return User;
};
